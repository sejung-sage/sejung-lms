-- ============================================================
-- ERP 연동 — 강사 · 강좌 · 학생을 ERP(세정ERP) 값 그대로 들고 온다
--
-- 공간(teacher_spaces) 1개 = ERP 강사 1명(지점별), 강좌(classes) 1개 = ERP 강좌 1개.
-- erp_* 키로 다시 돌려도(supabase/erp-sync.mjs) 같은 row 를 갱신한다.
-- LMS 에서 직접 만든 강사·강좌는 erp_* 가 비어 있고, 동기화가 건드리지 않는다.
-- ============================================================

alter table public.branches
  add column if not exists erp_id text unique;

alter table public.teacher_spaces
  add column if not exists erp_teacher_id   text unique,
  add column if not exists phone            text,
  add column if not exists email            text,
  add column if not exists subjects         text[] not null default '{}',
  add column if not exists corporation      text,
  add column if not exists hired_on         date,
  add column if not exists employment       text not null default '재직' check (employment in ('재직', '퇴사')),
  add column if not exists synced_at        timestamptz;

alter table public.classes
  add column if not exists erp_class_id      text unique,
  add column if not exists branch_id         uuid references public.branches (id) on delete set null,
  add column if not exists subject           text,
  add column if not exists subject_detail    text,
  add column if not exists kind              text not null default 'regular' check (kind in ('regular', 'special')),
  add column if not exists starts_on         date,
  add column if not exists ends_on           date,
  add column if not exists total_sessions    int,
  add column if not exists price_per_session int,
  add column if not exists capacity          int,
  add column if not exists is_closed         boolean not null default false,
  add column if not exists recruitment       text,
  -- [{weekday:'월', start_time:'18:00', end_time:'20:00', room_name:'대치관 101'}]
  add column if not exists slots             jsonb not null default '[]'::jsonb,
  add column if not exists synced_at         timestamptz;
create index if not exists classes_branch_idx on public.classes (branch_id);
create index if not exists classes_open_idx on public.classes (space_id, is_closed);

alter table public.students
  add column if not exists erp_student_id text unique,
  add column if not exists aca_id         text,
  add column if not exists synced_at      timestamptz;

alter table public.parents
  add column if not exists erp_key text unique;   -- 학부모 번호(숫자만) — 형제가 같은 학부모를 공유한다

alter table public.class_members
  add column if not exists enrolled_on date;
