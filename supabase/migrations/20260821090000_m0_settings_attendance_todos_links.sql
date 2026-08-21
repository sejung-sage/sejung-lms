-- ============================================================
-- 세정 LMS — M0: 정책 플래그 · 출결 · 할 일 · 매직링크
--
-- PRD 8-2 의 P0 추가 테이블 4종.
--   space_settings : 테넌트 정책을 코드가 아니라 데이터로 (PRD 7장)
--   attendance     : 차시별 출결 (기존 스키마에 없던 구멍)
--   todos          : 자동 연쇄(F-3)가 만들어내는 학생 할 일
--   magic_links    : 로그인 없이 단일 동작 수행 (PRD 4-1)
-- ============================================================

-- ------------------------------------------------------------
-- space_settings : 공간별 정책 플래그
-- 컬럼을 늘리지 않고 jsonb 하나로 받는다. 기본값은 코드 상수(lib/settings.ts)에
-- 두고, 여기에는 "기본값과 다른 것"만 쌓인다.
-- ------------------------------------------------------------
create table public.space_settings (
  space_id    uuid primary key references public.teacher_spaces (id) on delete cascade,
  settings    jsonb not null default '{}'::jsonb,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
comment on table public.space_settings is
  '테넌트 정책 플래그. 기본값은 코드에, 여기엔 override 만.';

-- 기존 공간에 빈 설정 행 생성
insert into public.space_settings (space_id)
select id from public.teacher_spaces
on conflict (space_id) do nothing;

-- ------------------------------------------------------------
-- attendance : 차시 × 학생 출결
-- 상태값은 대치온 도메인 그대로 (현장/영상/지각/조퇴/결석/퇴원/부재/미정).
-- '라이브'/'응시' 는 space_settings 로 켜는 확장 유형이라 여기 넣지 않는다.
-- ------------------------------------------------------------
create type public.attendance_status as enum (
  'present',      -- 현장
  'video',        -- 영상
  'late',         -- 지각
  'early_leave',  -- 조퇴
  'absent',       -- 결석
  'withdrawn',    -- 퇴원
  'none',         -- 부재
  'undecided'     -- 미정
);

create table public.attendance (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.teacher_spaces (id) on delete cascade,  -- RLS 스코프용 비정규화
  session_id  uuid not null references public.sessions (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  status      public.attendance_status not null default 'undecided',
  note        text,
  -- 출결 잠금: 다음 차시로 상태를 이월할 때 덮어쓰지 않는다
  locked      boolean not null default false,
  marked_by   uuid references public.profiles (id) on delete set null,
  marked_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (session_id, student_id)
);
create index on public.attendance (space_id);
create index on public.attendance (student_id);
-- 출결 이력 칩(최근 N차시)을 학생별로 뽑는 쿼리용
create index on public.attendance (student_id, session_id);

-- ------------------------------------------------------------
-- todos : 학생 할 일
-- 대부분 자동 연쇄가 만든다. source_table/source_id 로 유발 원인을 남겨
--   ① 중복 생성 방지  ② 원인이 해소되면 자동 완료
-- 를 둘 다 할 수 있게 한다.
-- ------------------------------------------------------------
create type public.todo_kind as enum (
  'retake',          -- 재시험 응시 필요
  'online_submit',   -- 온라인 제출 필요
  'clinic_reserve',  -- 클리닉 예약 필요
  'assignment',      -- 과제 제출
  'survey',          -- 설문 응답
  'custom'           -- 수동 생성
);

create type public.todo_state as enum ('open', 'done', 'waived');

create table public.todos (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references public.teacher_spaces (id) on delete cascade,
  student_id     uuid not null references public.students (id) on delete cascade,
  kind           public.todo_kind not null,
  title          text not null,
  body           text,
  due_at         timestamptz,
  state          public.todo_state not null default 'open',
  -- 유발 원인 (예: exam_results / clinics 의 row)
  source_table   text,
  source_id      uuid,
  auto_generated boolean not null default true,
  completed_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index on public.todos (space_id);
create index on public.todos (student_id, state);

-- 같은 원인으로 같은 종류의 할 일이 두 번 생기지 않게 (연쇄가 재실행돼도 안전)
create unique index todos_source_unique
  on public.todos (student_id, kind, source_id)
  where source_id is not null;

-- ------------------------------------------------------------
-- magic_links : 알림에서 로그인 없이 바로 처리
-- 읽기 액션은 TTL 안에서 재열람 가능, 쓰기 액션은 consumed_at 으로 1회 소비.
-- 검증은 반드시 서버(service role)에서. token 은 URL 에 들어가므로 추측 불가한 난수.
-- ------------------------------------------------------------
create type public.magic_action as enum (
  'clinic_arrived',   -- 등원 처리      (쓰기)
  'clinic_departed',  -- 하원 처리      (쓰기)
  'report',           -- 성적표 열람    (읽기)
  'todo',             -- 할 일 확인     (읽기)
  'qna',              -- 질의응답 확인  (읽기)
  'survey',           -- 설문 응답      (쓰기)
  'temp_login'        -- 임시 로그인    (쓰기)
);

create table public.magic_links (
  id              uuid primary key default gen_random_uuid(),
  token           text not null unique,
  space_id        uuid not null references public.teacher_spaces (id) on delete cascade,
  action          public.magic_action not null,
  -- 대상 바인딩 — 둘 중 하나 이상은 있어야 누구의 링크인지 알 수 있다
  student_id      uuid references public.students (id) on delete cascade,
  profile_id      uuid references public.profiles (id) on delete cascade,
  target_id       uuid,                                  -- 액션 대상 row (예약/성적/설문 …)
  payload         jsonb not null default '{}'::jsonb,
  expires_at      timestamptz not null default now() + interval '14 days',
  consumed_at     timestamptz,                           -- 쓰기 액션 1회 소비
  view_count      int not null default 0,
  last_viewed_at  timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint magic_links_has_subject check (student_id is not null or profile_id is not null)
);
create index on public.magic_links (space_id);
create index on public.magic_links (student_id);
create index on public.magic_links (expires_at);

-- ============================================================
-- RLS
-- ============================================================
alter table public.space_settings enable row level security;
alter table public.attendance     enable row level security;
alter table public.todos          enable row level security;
alter table public.magic_links    enable row level security;

-- space_settings : 학생 화면 레이아웃 설정도 여기 들어가므로 읽기는 공간 전체에 연다
create policy space_settings_read on public.space_settings for select to authenticated
  using (public.can_read_space(space_id));
create policy space_settings_write on public.space_settings for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));

-- attendance : 본인/자녀 + 운영진 읽기 / 운영진 쓰기
create policy attendance_read on public.attendance for select to authenticated
  using (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id));
create policy attendance_write on public.attendance for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));

-- todos : 본인/자녀 + 운영진 읽기 / 운영진 + 본인(체크 처리) 쓰기
create policy todos_read on public.todos for select to authenticated
  using (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id));
create policy todos_write on public.todos for all to authenticated
  using (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id))
  with check (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id));

-- magic_links : 토큰 자체가 인증수단이므로 authenticated 에게는 운영진만 노출.
-- 비로그인 처리는 서버에서 service role 로 토큰 검증 후 수행한다.
create policy magic_links_staff on public.magic_links for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));
