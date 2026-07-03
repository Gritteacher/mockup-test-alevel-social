-- Mock Exam A-Level สังคม By ครูไต๋
-- Run this file in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  nickname text,
  school text,
  grade text,
  room text,
  target_score integer default 80,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quota_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  mock_quota integer not null default 3 check (mock_quota >= 0),
  practice_points integer not null default 0 check (practice_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quota_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  type text not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_minutes integer not null default 90 check (duration_minutes > 0),
  quota_cost integer not null default 1 check (quota_cost >= 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'inactive')),
  mode text not null default 'mock' check (mode in ('mock', 'practice')),
  exam_type text not null default 'mock' check (exam_type in ('mock', 'practice', 'quiz', 'timed')),
  subject text not null default 'แบบรวมสาระ',
  difficulty text not null default 'ปานกลาง',
  passing_score integer not null default 70 check (passing_score between 0 and 100),
  shuffle_questions boolean not null default false,
  shuffle_choices boolean not null default false,
  answer_reveal text not null default 'after_submit' check (answer_reveal in ('immediate', 'after_submit')),
  source_format text not null default 'manual',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  subject text not null default 'หน้าที่พลเมือง',
  subject_id text,
  topic_id text,
  difficulty text not null default 'ปานกลาง',
  explanation text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  choice_text text not null,
  is_correct boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_set_questions (
  exam_set_id uuid not null references public.exam_sets(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  position integer not null,
  primary key (exam_set_id, question_id)
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exam_set_id uuid not null references public.exam_sets(id) on delete restrict,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired')),
  score integer not null default 0,
  total_questions integer not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  duration_seconds integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  selected_choice_id uuid references public.question_choices(id) on delete set null,
  is_correct boolean not null default false,
  order_no integer,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

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

create index if not exists quota_transactions_user_created_idx on public.quota_transactions(user_id, created_at desc);
create index if not exists attempts_user_created_idx on public.attempts(user_id, created_at desc);
create index if not exists attempt_answers_attempt_idx on public.attempt_answers(attempt_id);
create index if not exists question_choices_question_position_idx on public.question_choices(question_id, position);
create index if not exists exam_set_questions_exam_position_idx on public.exam_set_questions(exam_set_id, position);
create index if not exists practice_progress_user_idx on public.practice_progress(user_id, updated_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists quota_wallets_touch_updated_at on public.quota_wallets;
create trigger quota_wallets_touch_updated_at
before update on public.quota_wallets
for each row execute function public.touch_updated_at();

drop trigger if exists exam_sets_touch_updated_at on public.exam_sets;
create trigger exam_sets_touch_updated_at
before update on public.exam_sets
for each row execute function public.touch_updated_at();

drop trigger if exists questions_touch_updated_at on public.questions;
create trigger questions_touch_updated_at
before update on public.questions
for each row execute function public.touch_updated_at();

drop trigger if exists practice_progress_touch_updated_at on public.practice_progress;
create trigger practice_progress_touch_updated_at
before update on public.practice_progress
for each row execute function public.touch_updated_at();

create or replace function public.is_admin_or_teacher()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('teacher', 'admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, nickname)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.quota_wallets (user_id, mock_quota, practice_points)
  values (new.id, 3, 0)
  on conflict (user_id) do nothing;

  insert into public.quota_transactions (user_id, amount, type, note)
  values (new.id, 3, 'initial_quota', 'โควตาเริ่มต้นสำหรับนักเรียนใหม่')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.start_mock_attempt(p_exam_set_id uuid)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_exam public.exam_sets%rowtype;
  v_wallet public.quota_wallets%rowtype;
  v_attempt public.attempts%rowtype;
  v_total integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_exam
  from public.exam_sets
  where id = p_exam_set_id and status = 'published' and mode = 'mock';

  if not found then
    raise exception 'exam set not found';
  end if;

  select * into v_wallet
  from public.quota_wallets
  where user_id = v_user_id
  for update;

  if not found then
    insert into public.quota_wallets (user_id, mock_quota, practice_points)
    values (v_user_id, 3, 0)
    returning * into v_wallet;
  end if;

  if v_wallet.mock_quota < v_exam.quota_cost then
    raise exception 'quota not enough';
  end if;

  update public.quota_wallets
  set mock_quota = mock_quota - v_exam.quota_cost
  where user_id = v_user_id;

  insert into public.quota_transactions (user_id, amount, type, note)
  values (v_user_id, -v_exam.quota_cost, 'use_mock_quota', 'เริ่มทำ ' || v_exam.title);

  select count(*) into v_total
  from public.exam_set_questions
  where exam_set_id = p_exam_set_id;

  insert into public.attempts (user_id, exam_set_id, total_questions)
  values (v_user_id, p_exam_set_id, v_total)
  returning * into v_attempt;

  return v_attempt;
end;
$$;

create or replace function public.admin_adjust_quota(p_user_id uuid, p_amount integer, p_note text default null)
returns public.quota_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.quota_wallets%rowtype;
begin
  if not public.is_admin_or_teacher() then
    raise exception 'permission denied';
  end if;

  insert into public.quota_wallets (user_id, mock_quota, practice_points)
  values (p_user_id, greatest(0, p_amount), 0)
  on conflict (user_id) do update
  set mock_quota = greatest(0, public.quota_wallets.mock_quota + p_amount)
  returning * into v_wallet;

  insert into public.quota_transactions (user_id, amount, type, note, created_by)
  values (
    p_user_id,
    p_amount,
    case when p_amount >= 0 then 'admin_add_quota' else 'admin_remove_quota' end,
    p_note,
    auth.uid()
  );

  return v_wallet;
end;
$$;

create or replace function public.submit_practice_answer(p_question_id uuid, p_choice_id uuid)
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
  join public.question_choices c on c.question_id = q.id and c.is_correct = true
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
  values (
    v_user_id,
    p_question_id,
    p_choice_id,
    0,
    false,
    null
  )
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

create or replace function public.admin_delete_exam_set(p_exam_set_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_count integer;
  v_deleted_count integer;
begin
  if auth.uid() is null or not public.is_admin_or_teacher() then
    raise exception 'not authorized';
  end if;

  select count(*)::integer
  into v_attempt_count
  from public.attempts
  where exam_set_id = p_exam_set_id;

  delete from public.attempts
  where exam_set_id = p_exam_set_id;

  delete from public.exam_sets
  where id = p_exam_set_id;

  get diagnostics v_deleted_count = row_count;
  if v_deleted_count = 0 then
    raise exception 'exam set not found';
  end if;

  return v_attempt_count;
end;
$$;

revoke all on function public.admin_delete_exam_set(uuid) from public;
grant execute on function public.admin_delete_exam_set(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.quota_wallets enable row level security;
alter table public.quota_transactions enable row level security;
alter table public.exam_sets enable row level security;
alter table public.questions enable row level security;
alter table public.question_choices enable row level security;
alter table public.exam_set_questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.practice_progress enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
for select using (id = auth.uid() or public.is_admin_or_teacher());

drop policy if exists "profiles update own safe fields" on public.profiles;
create policy "profiles update own safe fields" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "wallet read own or admin" on public.quota_wallets;
create policy "wallet read own or admin" on public.quota_wallets
for select using (user_id = auth.uid() or public.is_admin_or_teacher());

drop policy if exists "transactions read own or admin" on public.quota_transactions;
create policy "transactions read own or admin" on public.quota_transactions
for select using (user_id = auth.uid() or public.is_admin_or_teacher());

drop policy if exists "published exams readable" on public.exam_sets;
create policy "published exams readable" on public.exam_sets
for select using (status = 'published' or public.is_admin_or_teacher());

drop policy if exists "admin manage exams" on public.exam_sets;
create policy "admin manage exams" on public.exam_sets
for all using (public.is_admin_or_teacher()) with check (public.is_admin_or_teacher());

drop policy if exists "questions readable" on public.questions;
create policy "questions readable" on public.questions
for select using (true);

drop policy if exists "admin manage questions" on public.questions;
create policy "admin manage questions" on public.questions
for all using (public.is_admin_or_teacher()) with check (public.is_admin_or_teacher());

drop policy if exists "choices readable" on public.question_choices;
create policy "choices readable" on public.question_choices
for select using (true);

drop policy if exists "admin manage choices" on public.question_choices;
create policy "admin manage choices" on public.question_choices
for all using (public.is_admin_or_teacher()) with check (public.is_admin_or_teacher());

drop policy if exists "exam questions readable" on public.exam_set_questions;
create policy "exam questions readable" on public.exam_set_questions
for select using (true);

drop policy if exists "admin manage exam questions" on public.exam_set_questions;
create policy "admin manage exam questions" on public.exam_set_questions
for all using (public.is_admin_or_teacher()) with check (public.is_admin_or_teacher());

drop policy if exists "attempts read own or admin" on public.attempts;
create policy "attempts read own or admin" on public.attempts
for select using (user_id = auth.uid() or public.is_admin_or_teacher());

drop policy if exists "attempts update own" on public.attempts;
create policy "attempts update own" on public.attempts
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "attempt answers read own or admin" on public.attempt_answers;
create policy "attempt answers read own or admin" on public.attempt_answers
for select using (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_id
      and (a.user_id = auth.uid() or public.is_admin_or_teacher())
  )
);

drop policy if exists "attempt answers insert own" on public.attempt_answers;
create policy "attempt answers insert own" on public.attempt_answers
for insert with check (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_id
      and a.user_id = auth.uid()
      and a.status = 'in_progress'
  )
);

drop policy if exists "practice progress read own" on public.practice_progress;
create policy "practice progress read own" on public.practice_progress
for select using (user_id = auth.uid());

-- Practice set rounds

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
