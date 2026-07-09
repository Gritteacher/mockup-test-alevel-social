-- Add optional images to individual questions and allow admins/teachers
-- to manage image files after importing an exam package JSON.

alter table public.questions
  add column if not exists image_url text,
  add column if not exists image_alt text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  true,
  4194304,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "question images readable" on storage.objects;
create policy "question images readable" on storage.objects
for select
using (bucket_id = 'question-images');

drop policy if exists "admin manage question images" on storage.objects;
create policy "admin manage question images" on storage.objects
for all
using (bucket_id = 'question-images' and public.is_admin_or_teacher())
with check (bucket_id = 'question-images' and public.is_admin_or_teacher());
