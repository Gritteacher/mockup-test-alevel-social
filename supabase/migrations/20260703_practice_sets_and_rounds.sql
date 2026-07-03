-- Practice is completed one published exam set at a time.
-- A question can be answered only once per round; a new round is available
-- after every question in the current set has an answer.

create or replace function public.start_practice_attempt(p_exam_set_id uuid)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.attempts%rowtype;
  v_total integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.exam_sets
    where id = p_exam_set_id
      and exam_type = 'practice'
      and status = 'published'
  ) then
    raise exception 'practice set not found';
  end if;

  -- Prevent StrictMode/double taps from creating two active rounds.
  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || p_exam_set_id::text, 0)
  );

  select *
  into v_attempt
  from public.attempts
  where user_id = v_user_id
    and exam_set_id = p_exam_set_id
    and status = 'in_progress'
  order by created_at desc
  limit 1
  for update;

  if found then
    return v_attempt;
  end if;

  select count(*)::integer
  into v_total
  from public.exam_set_questions
  where exam_set_id = p_exam_set_id;

  if v_total = 0 then
    raise exception 'practice set has no questions';
  end if;

  insert into public.attempts (user_id, exam_set_id, total_questions)
  values (v_user_id, p_exam_set_id, v_total)
  returning * into v_attempt;

  return v_attempt;
end;
$$;

revoke all on function public.start_practice_attempt(uuid) from public;
grant execute on function public.start_practice_attempt(uuid) to authenticated;

create or replace function public.submit_practice_attempt_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_choice_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.attempts%rowtype;
  v_position integer;
  v_is_correct boolean;
  v_correct_choice_id uuid;
  v_explanation text;
  v_solved_at timestamptz;
  v_points_earned integer := 0;
  v_quota_earned integer := 0;
  v_wallet public.quota_wallets%rowtype;
  v_total_points integer;
  v_answered integer;
  v_score integer;
  v_completed boolean;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select a.*
  into v_attempt
  from public.attempts a
  join public.exam_sets e on e.id = a.exam_set_id
  where a.id = p_attempt_id
    and a.user_id = v_user_id
    and a.status = 'in_progress'
    and e.exam_type = 'practice'
    and e.status = 'published'
  for update of a;

  if not found then
    raise exception 'active practice round not found';
  end if;

  if exists (
    select 1 from public.attempt_answers
    where attempt_id = p_attempt_id and question_id = p_question_id
  ) then
    raise exception 'question already answered in this round';
  end if;

  select esq.position, c.is_correct
  into v_position, v_is_correct
  from public.exam_set_questions esq
  join public.question_choices c
    on c.question_id = esq.question_id
   and c.id = p_choice_id
  where esq.exam_set_id = v_attempt.exam_set_id
    and esq.question_id = p_question_id;

  if not found then
    raise exception 'invalid practice question or choice';
  end if;

  select c.id, q.explanation
  into v_correct_choice_id, v_explanation
  from public.questions q
  join public.question_choices c
    on c.question_id = q.id and c.is_correct = true
  where q.id = p_question_id
  order by c.position
  limit 1;

  if v_correct_choice_id is null then
    raise exception 'correct choice not configured';
  end if;

  insert into public.attempt_answers (
    attempt_id, question_id, selected_choice_id, is_correct, order_no
  ) values (
    p_attempt_id, p_question_id, p_choice_id, v_is_correct, v_position
  );

  insert into public.practice_progress (
    user_id, question_id, last_choice_id, attempts_count, last_is_correct, solved_at
  ) values (
    v_user_id, p_question_id, p_choice_id, 0, false, null
  ) on conflict (user_id, question_id) do nothing;

  select solved_at
  into v_solved_at
  from public.practice_progress
  where user_id = v_user_id and question_id = p_question_id
  for update;

  if v_is_correct and v_solved_at is null then
    v_points_earned := 10;
  end if;

  update public.practice_progress
  set last_choice_id = p_choice_id,
      attempts_count = attempts_count + 1,
      last_is_correct = v_is_correct,
      solved_at = case
        when v_is_correct then coalesce(solved_at, now())
        else solved_at
      end
  where user_id = v_user_id and question_id = p_question_id;

  insert into public.quota_wallets (user_id, mock_quota, practice_points)
  values (v_user_id, 3, 0)
  on conflict (user_id) do nothing;

  select *
  into v_wallet
  from public.quota_wallets
  where user_id = v_user_id
  for update;

  if v_points_earned > 0 then
    v_total_points := v_wallet.practice_points + v_points_earned;
    v_quota_earned := v_total_points / 100;

    update public.quota_wallets
    set practice_points = mod(v_total_points, 100),
        mock_quota = mock_quota + v_quota_earned
    where user_id = v_user_id
    returning * into v_wallet;

    if v_quota_earned > 0 then
      insert into public.quota_transactions (user_id, amount, type, note)
      values (
        v_user_id,
        v_quota_earned,
        'practice_exchange',
        'แลก 100 Practice Points เป็น Mock Quota'
      );
    end if;
  end if;

  select count(*)::integer,
         count(*) filter (where is_correct)::integer
  into v_answered, v_score
  from public.attempt_answers
  where attempt_id = p_attempt_id;

  v_completed := v_answered >= v_attempt.total_questions;

  update public.attempts
  set score = v_score,
      status = case when v_completed then 'submitted' else status end,
      submitted_at = case when v_completed then now() else submitted_at end,
      duration_seconds = extract(epoch from (now() - started_at))::integer
  where id = p_attempt_id;

  return jsonb_build_object(
    'is_correct', v_is_correct,
    'correct_choice_id', v_correct_choice_id,
    'explanation', coalesce(v_explanation, ''),
    'points_earned', v_points_earned,
    'practice_points', v_wallet.practice_points,
    'mock_quota', v_wallet.mock_quota,
    'quota_earned', v_quota_earned,
    'answered_count', v_answered,
    'score', v_score,
    'total_questions', v_attempt.total_questions,
    'completed', v_completed
  );
end;
$$;

revoke all on function public.submit_practice_attempt_answer(uuid, uuid, uuid) from public;
grant execute on function public.submit_practice_attempt_answer(uuid, uuid, uuid) to authenticated;
