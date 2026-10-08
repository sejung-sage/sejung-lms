-- ============================================================
-- 강좌(classes) 단위 운영: 조교 배정 · 수강생 배정
--
-- 공간(teacher_spaces) = 강사 한 명의 LMS, 강좌(classes) = 그 강사의 반.
-- 조교는 공간 운영진(space_staff)으로 들어오고, 어느 강좌를 맡는지는 class_staff 로 정한다.
-- 데이터 접근은 서비스 키 + lib/auth.ts 가드로 하므로 RLS 는 켜기만 하고 정책은
-- 읽기(공간 운영진)만 둔다 — 쓰기는 서버 액션만 한다.
-- ============================================================

create table if not exists public.class_staff (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  space_id    uuid not null references public.teacher_spaces (id) on delete cascade,  -- RLS 스코프용 비정규화
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (class_id, profile_id)
);
create index if not exists class_staff_profile_idx on public.class_staff (profile_id);
create index if not exists class_staff_space_idx on public.class_staff (space_id);

create table if not exists public.class_members (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  space_id    uuid not null references public.teacher_spaces (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (class_id, student_id)
);
create index if not exists class_members_student_idx on public.class_members (student_id);
create index if not exists class_members_space_idx on public.class_members (space_id);

alter table public.class_staff   enable row level security;
alter table public.class_members enable row level security;

create policy class_staff_read on public.class_staff for select to authenticated
  using (public.is_space_staff(space_id));
create policy class_members_read on public.class_members for select to authenticated
  using (public.is_space_staff(space_id));

-- 기존 수강생을 출결 기록 기준으로 강좌에 넣어 둔다 (처음 화면이 비어 보이지 않게)
insert into public.class_members (class_id, space_id, student_id)
select distinct s.class_id, s.space_id, a.student_id
from public.attendance a
join public.sessions s on s.id = a.session_id
join public.enrollments e on e.student_id = a.student_id and e.space_id = s.space_id and e.status = 'active'
on conflict (class_id, student_id) do nothing;
