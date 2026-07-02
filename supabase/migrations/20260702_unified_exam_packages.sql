alter table public.exam_sets
  add column if not exists exam_type text not null default 'mock',
  add column if not exists subject text not null default 'แบบรวมสาระ',
  add column if not exists difficulty text not null default 'ปานกลาง',
  add column if not exists passing_score integer not null default 70,
  add column if not exists shuffle_questions boolean not null default false,
  add column if not exists shuffle_choices boolean not null default false,
  add column if not exists answer_reveal text not null default 'after_submit',
  add column if not exists source_format text not null default 'manual';

alter table public.exam_sets drop constraint if exists exam_sets_status_check;
alter table public.exam_sets
  add constraint exam_sets_status_check
  check (status in ('draft', 'published', 'inactive'));

alter table public.exam_sets drop constraint if exists exam_sets_exam_type_check;
alter table public.exam_sets
  add constraint exam_sets_exam_type_check
  check (exam_type in ('mock', 'practice', 'quiz', 'timed'));

alter table public.exam_sets drop constraint if exists exam_sets_passing_score_check;
alter table public.exam_sets
  add constraint exam_sets_passing_score_check
  check (passing_score between 0 and 100);

alter table public.exam_sets drop constraint if exists exam_sets_answer_reveal_check;
alter table public.exam_sets
  add constraint exam_sets_answer_reveal_check
  check (answer_reveal in ('immediate', 'after_submit'));

update public.exam_sets
set exam_type = case when mode = 'practice' then 'practice' else 'mock' end
where exam_type is null or exam_type = 'mock';

alter table public.question_choices
  add column if not exists position integer not null default 0;

with ranked as (
  select id, row_number() over (partition by question_id order by created_at, id)::integer as choice_position
  from public.question_choices
)
update public.question_choices choices
set position = ranked.choice_position
from ranked
where choices.id = ranked.id and choices.position = 0;

create index if not exists question_choices_question_position_idx
on public.question_choices(question_id, position);
