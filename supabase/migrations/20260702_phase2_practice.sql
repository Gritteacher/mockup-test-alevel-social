create table if not exists public.practice_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  last_choice_id uuid references public.question_choices(id) on delete set null,
  attempts_count integer not null default 0 check (attempts_count >= 0),
  last_is_correct boolean not null default false,
  solved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists practice_progress_user_idx
on public.practice_progress(user_id, updated_at desc);

drop trigger if exists practice_progress_touch_updated_at on public.practice_progress;
create trigger practice_progress_touch_updated_at
before update on public.practice_progress
for each row execute function public.touch_updated_at();

alter table public.practice_progress enable row level security;

drop policy if exists "practice progress read own" on public.practice_progress;
create policy "practice progress read own" on public.practice_progress
for select using (user_id = auth.uid());

create or replace function public.submit_practice_answer(
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
  v_is_correct boolean;
  v_correct_choice_id uuid;
  v_explanation text;
  v_solved_at timestamptz;
  v_points_earned integer := 0;
  v_quota_earned integer := 0;
  v_wallet public.quota_wallets%rowtype;
  v_total_points integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select c.is_correct
  into v_is_correct
  from public.question_choices c
  where c.id = p_choice_id and c.question_id = p_question_id;

  if not found then
    raise exception 'invalid choice';
  end if;

  select c.id, q.explanation
  into v_correct_choice_id, v_explanation
  from public.questions q
  join public.question_choices c
    on c.question_id = q.id and c.is_correct = true
  where q.id = p_question_id
  limit 1;

  if v_correct_choice_id is null then
    raise exception 'correct choice not configured';
  end if;

  insert into public.practice_progress (
    user_id,
    question_id,
    last_choice_id,
    attempts_count,
    last_is_correct,
    solved_at
  )
  values (v_user_id, p_question_id, p_choice_id, 0, false, null)
  on conflict (user_id, question_id) do nothing;

  select solved_at
  into v_solved_at
  from public.practice_progress
  where user_id = v_user_id and question_id = p_question_id
  for update;

  if v_is_correct and v_solved_at is null then
    v_points_earned := 10;
  end if;

  update public.practice_progress
  set
    last_choice_id = p_choice_id,
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
    set
      practice_points = mod(v_total_points, 100),
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

  return jsonb_build_object(
    'is_correct', v_is_correct,
    'correct_choice_id', v_correct_choice_id,
    'explanation', coalesce(v_explanation, ''),
    'points_earned', v_points_earned,
    'practice_points', v_wallet.practice_points,
    'mock_quota', v_wallet.mock_quota,
    'quota_earned', v_quota_earned
  );
end;
$$;

revoke all on function public.submit_practice_answer(uuid, uuid) from public;
grant execute on function public.submit_practice_answer(uuid, uuid) to authenticated;
