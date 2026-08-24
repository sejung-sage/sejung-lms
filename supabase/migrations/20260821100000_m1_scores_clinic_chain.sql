-- ============================================================
-- 세정 LMS — M1: 성적 원천 · 재시험/할 일 자동 연쇄 · 클리닉 예약
--
-- 목표:
--   1) 시험/문항/응답을 엑셀 대체 가능한 형태로 확장
--   2) 커트라인 미달 → 재시험 → 학생 할 일 생성을 DB에서 멱등 처리
--   3) 기존 clinics(학생별 신청)보다 실제 운영에 맞는 세션/예약 모델 추가
-- ============================================================

do $$ begin
  create type public.score_status as enum ('open', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.score_unit as enum ('points', 'percentage', 'completion', 'abcdf');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.attempt_channel as enum ('field', 'online');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.retake_state as enum (
    'not_entered',
    'grading_pending',
    'passed',
    'not_passed',
    'passed_by_agreement',
    'passed_by_oral',
    'give_up'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.clinic_reservation_status as enum (
    'reserved',
    'arrived',
    'departed',
    'no_show',
    'canceled'
  );
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- exams / exam_results 확장
-- ------------------------------------------------------------
alter table public.exams
  add column if not exists score_status public.score_status not null default 'closed',
  add column if not exists score_unit public.score_unit not null default 'points',
  add column if not exists cutoff_score numeric,
  add column if not exists default_channel public.attempt_channel not null default 'field',
  add column if not exists stats jsonb not null default '{}'::jsonb,
  add column if not exists published_at timestamptz;

alter table public.exam_results
  add column if not exists channel public.attempt_channel,
  add column if not exists feedback text,
  add column if not exists rank int,
  add column if not exists percentile numeric,
  add column if not exists updated_at timestamptz not null default now();

-- ------------------------------------------------------------
-- exam_questions / exam_answers : 문항별 통계의 원천
-- ------------------------------------------------------------
create table if not exists public.exam_questions (
  id             uuid primary key default gen_random_uuid(),
  exam_id         uuid not null references public.exams (id) on delete cascade,
  question_no     int not null,
  points          numeric not null default 1,
  correct_answers text[] not null default '{}',
  exception_answers text[] not null default '{}',
  choices         text[] not null default '{}',
  concept_tags    text[] not null default '{}',
  created_at      timestamptz not null default now(),
  unique (exam_id, question_no)
);
create index if not exists exam_questions_exam_id_idx on public.exam_questions (exam_id);

create table if not exists public.exam_answers (
  id             uuid primary key default gen_random_uuid(),
  exam_id         uuid not null references public.exams (id) on delete cascade,
  question_id     uuid not null references public.exam_questions (id) on delete cascade,
  student_id      uuid not null references public.students (id) on delete cascade,
  answer          text,
  is_correct      boolean,
  earned_points   numeric,
  graded_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (question_id, student_id)
);
create index if not exists exam_answers_exam_id_idx on public.exam_answers (exam_id);
create index if not exists exam_answers_student_id_idx on public.exam_answers (student_id);

-- ------------------------------------------------------------
-- retakes : 재시험 차수
-- ------------------------------------------------------------
create table if not exists public.retakes (
  id                 uuid primary key default gen_random_uuid(),
  space_id           uuid not null references public.teacher_spaces (id) on delete cascade,
  original_exam_id   uuid not null references public.exams (id) on delete cascade,
  original_result_id uuid references public.exam_results (id) on delete cascade,
  student_id         uuid not null references public.students (id) on delete cascade,
  attempt_no         int not null default 1,
  state              public.retake_state not null default 'not_entered',
  score              numeric,
  scheduled_at       timestamptz,
  graded_at          timestamptz,
  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (original_exam_id, student_id, attempt_no)
);
create index if not exists retakes_space_id_idx on public.retakes (space_id);
create index if not exists retakes_student_state_idx on public.retakes (student_id, state);

-- ------------------------------------------------------------
-- clinic_sessions / clinic_reservations
-- ------------------------------------------------------------
create table if not exists public.clinic_sessions (
  id             uuid primary key default gen_random_uuid(),
  space_id        uuid not null references public.teacher_spaces (id) on delete cascade,
  class_id        uuid references public.classes (id) on delete set null,
  title           text not null,
  location        text,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  capacity        int not null default 8 check (capacity > 0),
  opens_at        timestamptz,
  closes_at       timestamptz,
  quota_by_class  jsonb not null default '{}'::jsonb,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists clinic_sessions_space_starts_idx on public.clinic_sessions (space_id, starts_at);

create table if not exists public.clinic_reservations (
  id                uuid primary key default gen_random_uuid(),
  space_id          uuid not null references public.teacher_spaces (id) on delete cascade,
  clinic_session_id uuid not null references public.clinic_sessions (id) on delete cascade,
  student_id        uuid not null references public.students (id) on delete cascade,
  retake_id         uuid references public.retakes (id) on delete set null,
  status            public.clinic_reservation_status not null default 'reserved',
  reserved_by       uuid references public.profiles (id) on delete set null,
  arrived_at        timestamptz,
  departed_at       timestamptz,
  assistant_id      uuid references public.profiles (id) on delete set null,
  feedback          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (clinic_session_id, student_id)
);
create index if not exists clinic_reservations_space_id_idx on public.clinic_reservations (space_id);
create index if not exists clinic_reservations_student_status_idx on public.clinic_reservations (student_id, status);

-- ------------------------------------------------------------
-- student_memos : 학생 메모/상담일지
-- ------------------------------------------------------------
create table if not exists public.student_memos (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.teacher_spaces (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  kind        text not null default 'memo' check (kind in ('memo', 'counsel')),
  body        text not null,
  pinned      boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists student_memos_space_student_idx on public.student_memos (space_id, student_id, created_at desc);

-- ------------------------------------------------------------
-- 자동 연쇄: 커트라인 미달 결과 → retake + todo
-- ------------------------------------------------------------
create or replace function public.exam_cutoff_for(_exam public.exams)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    _exam.cutoff_score,
    (
      select nullif((ss.settings #>> '{exams,defaultCutoffScore}'), '')::numeric
      from public.space_settings ss
      where ss.space_id = _exam.space_id
    )
  );
$$;

create or replace function public.recompute_exam_stats(_exam_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  with scored as (
    select
      id,
      score,
      rank() over (order by score desc) as rank_no,
      count(*) over () as total_count
    from public.exam_results
    where exam_id = _exam_id and score is not null
  )
  update public.exam_results r
     set rank = s.rank_no,
         percentile = case
           when s.total_count <= 1 then 1
           else round(((s.rank_no - 1)::numeric / s.total_count::numeric) * 100, 1)
         end,
         updated_at = now()
    from scored s
   where r.id = s.id;

  with scores as (
    select score
    from public.exam_results
    where exam_id = _exam_id and score is not null
  ),
  ranked as (
    select score, ntile(10) over (order by score desc) as decile
    from scores
  )
  select jsonb_build_object(
    'count', count(*),
    'avg', coalesce(round(avg(score), 2), 0),
    'stddev', coalesce(round(stddev_pop(score), 2), 0),
    'max', coalesce(max(score), 0),
    'top10Avg', coalesce(round(avg(score) filter (where decile = 1), 2), 0)
  )
  into payload
  from ranked;

  update public.exams
     set stats = coalesce(payload, '{}'::jsonb)
   where id = _exam_id;
end;
$$;

create or replace function public.recompute_exam_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_exam_stats(coalesce(new.exam_id, old.exam_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recompute_exam_stats on public.exam_results;
create trigger trg_recompute_exam_stats
  after insert or update of score or delete on public.exam_results
  for each row execute function public.recompute_exam_stats_trigger();

create or replace function public.enqueue_retake_for_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.exams%rowtype;
  cutoff numeric;
  retake_row public.retakes%rowtype;
begin
  if new.score is null then
    return new;
  end if;

  select * into e from public.exams where id = new.exam_id;
  if not found then
    return new;
  end if;

  cutoff := public.exam_cutoff_for(e);
  if cutoff is null then
    return new;
  end if;

  if new.score >= cutoff then
    update public.todos t
       set state = 'done', completed_at = coalesce(t.completed_at, now())
      from public.retakes r
     where r.original_exam_id = e.id
       and r.student_id = new.student_id
       and t.source_table = 'retakes'
       and t.source_id = r.id
       and t.state = 'open';

    update public.retakes
       set state = 'passed', updated_at = now()
     where original_exam_id = e.id
       and student_id = new.student_id
       and state in ('not_entered', 'grading_pending', 'not_passed');

    return new;
  end if;

  insert into public.retakes (
    space_id, original_exam_id, original_result_id, student_id, attempt_no, state
  ) values (
    e.space_id, e.id, new.id, new.student_id, 1, 'not_entered'
  )
  on conflict (original_exam_id, student_id, attempt_no)
  do update set updated_at = now()
  returning * into retake_row;

  insert into public.todos (
    space_id, student_id, kind, title, body, due_at, source_table, source_id, auto_generated
  ) values (
    e.space_id,
    new.student_id,
    'retake',
    e.title || ' 재시험 응시',
    '커트라인 ' || cutoff::text || '점 미만입니다. 재시험 또는 클리닉 예약이 필요합니다.',
    coalesce(e.exam_date::timestamptz + interval '7 days', now() + interval '7 days'),
    'retakes',
    retake_row.id,
    true
  )
  on conflict (student_id, kind, source_id) where source_id is not null
  do update set state = 'open', completed_at = null;

  insert into public.todos (
    space_id, student_id, kind, title, body, due_at, source_table, source_id, auto_generated
  ) values (
    e.space_id,
    new.student_id,
    'clinic_reserve',
    e.title || ' 클리닉 예약',
    '재시험 전 클리닉을 예약해 주세요.',
    now() + interval '3 days',
    'retakes',
    retake_row.id,
    true
  )
  on conflict (student_id, kind, source_id) where source_id is not null
  do nothing;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_retake_for_result on public.exam_results;
create trigger trg_enqueue_retake_for_result
  after insert or update of score on public.exam_results
  for each row execute function public.enqueue_retake_for_result();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.exam_questions       enable row level security;
alter table public.exam_answers         enable row level security;
alter table public.retakes              enable row level security;
alter table public.clinic_sessions      enable row level security;
alter table public.clinic_reservations  enable row level security;
alter table public.student_memos        enable row level security;

drop policy if exists exam_questions_read on public.exam_questions;
create policy exam_questions_read on public.exam_questions for select to authenticated
  using (exists (select 1 from public.exams e where e.id = exam_id and public.can_read_space(e.space_id)));
drop policy if exists exam_questions_write on public.exam_questions;
create policy exam_questions_write on public.exam_questions for all to authenticated
  using (exists (select 1 from public.exams e where e.id = exam_id and public.can_grade_in(e.space_id)))
  with check (exists (select 1 from public.exams e where e.id = exam_id and public.can_grade_in(e.space_id)));

drop policy if exists exam_answers_read on public.exam_answers;
create policy exam_answers_read on public.exam_answers for select to authenticated
  using (student_id in (select public.visible_student_ids())
    or exists (select 1 from public.exams e where e.id = exam_id and public.is_space_staff(e.space_id)));
drop policy if exists exam_answers_write on public.exam_answers;
create policy exam_answers_write on public.exam_answers for all to authenticated
  using (exists (select 1 from public.exams e where e.id = exam_id and public.can_grade_in(e.space_id)))
  with check (exists (select 1 from public.exams e where e.id = exam_id and public.can_grade_in(e.space_id)));

drop policy if exists retakes_read on public.retakes;
create policy retakes_read on public.retakes for select to authenticated
  using (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id));
drop policy if exists retakes_write on public.retakes;
create policy retakes_write on public.retakes for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));

drop policy if exists clinic_sessions_read on public.clinic_sessions;
create policy clinic_sessions_read on public.clinic_sessions for select to authenticated
  using (public.can_read_space(space_id));
drop policy if exists clinic_sessions_write on public.clinic_sessions;
create policy clinic_sessions_write on public.clinic_sessions for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));

drop policy if exists clinic_reservations_read on public.clinic_reservations;
create policy clinic_reservations_read on public.clinic_reservations for select to authenticated
  using (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id));
drop policy if exists clinic_reservations_write on public.clinic_reservations;
create policy clinic_reservations_write on public.clinic_reservations for all to authenticated
  using (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id))
  with check (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id));

drop policy if exists student_memos_read on public.student_memos;
create policy student_memos_read on public.student_memos for select to authenticated
  using (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id));
drop policy if exists student_memos_write on public.student_memos;
create policy student_memos_write on public.student_memos for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));
