-- ============================================================
-- 세정 LMS — 코어: 테넌트 + 정체성
-- 단일 학원(세정) 가정: academies 생략, branches 부터.
-- 학생은 세정(branch) 소속 → 쌤 교체돼도 이력 유지.
-- ============================================================

-- 역할: 세정 운영/실장 · 선생님 · 조교 · 학생 · 학부모
create type public.app_role as enum ('admin', 'teacher', 'assistant', 'student', 'parent');

-- ------------------------------------------------------------
-- profiles : auth.users 와 1:1. 로그인하는 모든 사용자.
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        public.app_role not null default 'student',
  created_at  timestamptz not null default now()
);
comment on table public.profiles is 'auth.users 1:1. role 로 UI 라우팅.';

-- auth.users 생성 시 profile 자동 생성 (role/이름은 메타데이터에서, 없으면 기본값)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- branches : 지점 (대치/반포/방배/송도 …)
-- ------------------------------------------------------------
create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- teacher_spaces : 쌤별 LMS 공간 (아이콘/테마색/브랜딩)
-- ------------------------------------------------------------
create table public.teacher_spaces (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references public.branches (id) on delete restrict,
  owner_id      uuid references public.profiles (id) on delete set null,
  name          text not null,                    -- "OOO쌤"
  subject       text,                             -- 수학/영어/국어 …
  slug          text unique,                      -- URL/식별용
  accent_color  text not null default '#2563eb',  -- 테마색
  logo_url      text,
  icon_url      text,                             -- 런처 아이콘 (없으면 템플릿)
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on public.teacher_spaces (branch_id);
create index on public.teacher_spaces (owner_id);
comment on table public.teacher_spaces is 'HM 런처의 쌤 아이콘 1개 = 이 row 1개.';

-- ------------------------------------------------------------
-- space_staff : 공간의 운영진(선생님/조교)과 권한 범위
-- owner 는 teacher_spaces.owner_id, 조교/공동교사는 여기서 관리.
-- ------------------------------------------------------------
create table public.space_staff (
  id                    uuid primary key default gen_random_uuid(),
  space_id              uuid not null references public.teacher_spaces (id) on delete cascade,
  profile_id            uuid not null references public.profiles (id) on delete cascade,
  staff_role            text not null default 'assistant' check (staff_role in ('teacher', 'assistant')),
  can_grade             boolean not null default true,   -- 채점 권한
  can_manage_students   boolean not null default false,  -- 학생 입력/관리 권한
  created_at            timestamptz not null default now(),
  unique (space_id, profile_id)
);
create index on public.space_staff (profile_id);

-- ------------------------------------------------------------
-- students : 세정 소속 학생 (쌤 종속 아님)
-- ------------------------------------------------------------
create table public.students (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches (id) on delete restrict,
  profile_id  uuid unique references public.profiles (id) on delete set null,  -- 학생 앱 로그인 연결
  name        text not null,
  phone       text,
  school      text,
  grade       text,
  status      text not null default 'active' check (status in ('active', 'inactive', 'withdrawn')),
  created_at  timestamptz not null default now()
);
create index on public.students (branch_id);
create index on public.students (profile_id);

-- ------------------------------------------------------------
-- enrollments : 학생 ↔ 쌤 공간 (런처 아이콘 소스)
-- 한 학생이 여러 공간에 등록 가능.
-- ------------------------------------------------------------
create table public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students (id) on delete cascade,
  space_id    uuid not null references public.teacher_spaces (id) on delete cascade,
  status      text not null default 'active' check (status in ('active', 'paused', 'ended')),
  enrolled_at timestamptz not null default now(),
  unique (student_id, space_id)
);
create index on public.enrollments (space_id);
create index on public.enrollments (student_id);

-- ------------------------------------------------------------
-- parents / parent_links : 학부모 ↔ 자녀
-- ------------------------------------------------------------
create table public.parents (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid unique references public.profiles (id) on delete set null,
  name        text not null,
  phone       text,
  created_at  timestamptz not null default now()
);

create table public.parent_links (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.parents (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  relation    text,  -- 모/부 …
  unique (parent_id, student_id)
);
create index on public.parent_links (student_id);
