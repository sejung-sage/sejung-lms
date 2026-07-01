-- ============================================================
-- 세정 LMS — 도메인: 수업/성적/숙제/클리닉/공지
-- 모든 도메인 row 는 space_id 로 테넌트 격리.
-- ============================================================

-- ------------------------------------------------------------
-- classes / sessions : 수업 · 회차 (CL)
-- ------------------------------------------------------------
create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.teacher_spaces (id) on delete cascade,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);
create index on public.classes (space_id);

create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes (id) on delete cascade,
  space_id      uuid not null references public.teacher_spaces (id) on delete cascade,  -- RLS 스코프용 비정규화
  session_no    int,
  title         text,
  scheduled_at  timestamptz,
  concept_tags  text[] not null default '{}',  -- 회차별 개념 태그
  created_at    timestamptz not null default now()
);
create index on public.sessions (class_id);
create index on public.sessions (space_id);

-- ------------------------------------------------------------
-- exams / exam_results : 시험 · 성적 (GR, OMR)
-- ------------------------------------------------------------
create table public.exams (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.teacher_spaces (id) on delete cascade,
  session_id  uuid references public.sessions (id) on delete set null,
  title       text not null,
  exam_type   text,                 -- 단어시험/문법/모의고사/숙제완성도 …
  max_score   numeric,
  exam_date   date,
  created_at  timestamptz not null default now()
);
create index on public.exams (space_id);

create table public.exam_results (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references public.exams (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  score       numeric,
  omr_data    jsonb,                -- OMR/자동채점 원본
  graded_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (exam_id, student_id)
);
create index on public.exam_results (student_id);

-- ------------------------------------------------------------
-- assignments / submissions : 숙제 (HW)
-- ------------------------------------------------------------
create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.teacher_spaces (id) on delete cascade,
  session_id  uuid references public.sessions (id) on delete set null,
  title       text not null,
  description text,
  due_date    date,
  created_at  timestamptz not null default now()
);
create index on public.assignments (space_id);

create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id    uuid not null references public.students (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'submitted', 'late', 'resubmit')),
  submitted_at  timestamptz,
  note          text,
  unique (assignment_id, student_id)
);
create index on public.submissions (student_id);

-- ------------------------------------------------------------
-- clinics : 클리닉 · 보강 신청 (HW-02)
-- ------------------------------------------------------------
create table public.clinics (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references public.teacher_spaces (id) on delete cascade,
  student_id    uuid not null references public.students (id) on delete cascade,
  reason        text,
  status        text not null default 'requested' check (status in ('requested', 'approved', 'done', 'canceled')),
  requested_at  timestamptz not null default now(),
  scheduled_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index on public.clinics (space_id);
create index on public.clinics (student_id);

-- ------------------------------------------------------------
-- notices : 공지 (NT)
-- ------------------------------------------------------------
create table public.notices (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.teacher_spaces (id) on delete cascade,
  title       text not null,
  body        text,
  audience    text not null default 'all' check (audience in ('all', 'students', 'parents')),
  created_at  timestamptz not null default now()
);
create index on public.notices (space_id);
