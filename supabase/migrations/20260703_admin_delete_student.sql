create table if not exists public.account_deletion_logs (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null,
  student_email text,
  student_name text,
  reason text not null,
  deleted_by uuid references public.profiles(id) on delete set null,
  notification_id text,
  created_at timestamptz not null default now()
);

alter table public.account_deletion_logs enable row level security;

drop policy if exists "admins read account deletion logs" on public.account_deletion_logs;
create policy "admins read account deletion logs"
on public.account_deletion_logs
for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

create or replace function public.admin_delete_student_account(
  p_user_id uuid,
  p_reason text,
  p_notification_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_student public.profiles%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_deleted integer;
begin
  select role into v_actor_role
  from public.profiles
  where id = v_actor_id;

  if v_actor_id is null or v_actor_role <> 'admin' then
    raise exception 'admin permission required';
  end if;

  if p_user_id = v_actor_id then
    raise exception 'cannot delete your own account';
  end if;

  if char_length(v_reason) < 5 or char_length(v_reason) > 1000 then
    raise exception 'deletion reason must contain 5 to 1000 characters';
  end if;

  select * into v_student
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'student not found';
  end if;

  if v_student.role <> 'student' then
    raise exception 'protected account cannot be deleted';
  end if;

  insert into public.account_deletion_logs (
    student_user_id,
    student_email,
    student_name,
    reason,
    deleted_by,
    notification_id
  ) values (
    v_student.id,
    v_student.email,
    v_student.full_name,
    v_reason,
    v_actor_id,
    p_notification_id
  );

  delete from auth.users where id = p_user_id;
  get diagnostics v_deleted = row_count;
  if v_deleted <> 1 then
    raise exception 'authentication account not found';
  end if;

  return jsonb_build_object(
    'deleted', true,
    'user_id', p_user_id,
    'email', v_student.email
  );
end;
$$;

revoke all on function public.admin_delete_student_account(uuid, text, text) from public;
grant execute on function public.admin_delete_student_account(uuid, text, text) to authenticated;
