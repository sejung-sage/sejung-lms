-- ============================================================
-- 세정 LMS — RLS
-- 헬퍼는 SECURITY DEFINER 로 내부에서 RLS 를 우회 → 정책 재귀 방지.
-- 테이블별로 read(select) / write(all) 정책 2개.
--   permissive 정책은 OR 로 합쳐지므로: select = read OR write.
-- ============================================================

-- ------------------------------------------------------------
-- 헬퍼 함수
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_space_staff(_space_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (select 1 from public.teacher_spaces s where s.id = _space_id and s.owner_id = auth.uid())
    or exists (select 1 from public.space_staff ss where ss.space_id = _space_id and ss.profile_id = auth.uid());
$$;

create or replace function public.can_manage_students_in(_space_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (select 1 from public.teacher_spaces s where s.id = _space_id and s.owner_id = auth.uid())
    or exists (select 1 from public.space_staff ss
               where ss.space_id = _space_id and ss.profile_id = auth.uid() and ss.can_manage_students);
$$;

create or replace function public.can_grade_in(_space_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (select 1 from public.teacher_spaces s where s.id = _space_id and s.owner_id = auth.uid())
    or exists (select 1 from public.space_staff ss
               where ss.space_id = _space_id and ss.profile_id = auth.uid() and ss.can_grade);
$$;

-- 내가 볼 수 있는 학생 id (본인=학생 + 자녀=학부모)
create or replace function public.visible_student_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select s.id from public.students s where s.profile_id = auth.uid()
  union
  select pl.student_id from public.parent_links pl
    join public.parents p on p.id = pl.parent_id
   where p.profile_id = auth.uid();
$$;

-- 내가 이 학생의 담당 운영진인가 (등록된 공간 중 하나라도 staff)
create or replace function public.is_staff_of_student(_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (select 1 from public.enrollments e
               where e.student_id = _student_id and public.is_space_staff(e.space_id));
$$;

-- 이 공간 콘텐츠를 읽을 수 있는가 (운영진 + 등록 학생/학부모)
create or replace function public.can_read_space(_space_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_space_staff(_space_id)
    or exists (select 1 from public.enrollments e
               where e.space_id = _space_id
                 and e.student_id in (select public.visible_student_ids()));
$$;

-- ------------------------------------------------------------
-- RLS 활성화
-- ------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.branches       enable row level security;
alter table public.teacher_spaces enable row level security;
alter table public.space_staff    enable row level security;
alter table public.students       enable row level security;
alter table public.enrollments    enable row level security;
alter table public.parents        enable row level security;
alter table public.parent_links   enable row level security;
alter table public.classes        enable row level security;
alter table public.sessions       enable row level security;
alter table public.exams          enable row level security;
alter table public.exam_results   enable row level security;
alter table public.assignments    enable row level security;
alter table public.submissions    enable row level security;
alter table public.clinics        enable row level security;
alter table public.notices        enable row level security;

-- ------------------------------------------------------------
-- profiles : 본인 + admin
-- ------------------------------------------------------------
create policy profiles_read  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_write on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- branches : 전체 읽기 / admin 쓰기
-- ------------------------------------------------------------
create policy branches_read  on public.branches for select to authenticated using (true);
create policy branches_write on public.branches for all    to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- teacher_spaces : 운영진 + 등록 학생/학부모 읽기 / admin·owner 쓰기
-- ------------------------------------------------------------
create policy spaces_read  on public.teacher_spaces for select to authenticated
  using (public.can_read_space(id));
create policy spaces_write on public.teacher_spaces for all to authenticated
  using (public.is_admin() or owner_id = auth.uid())
  with check (public.is_admin() or owner_id = auth.uid());

-- ------------------------------------------------------------
-- space_staff
-- ------------------------------------------------------------
create policy staff_read  on public.space_staff for select to authenticated
  using (public.is_space_staff(space_id) or profile_id = auth.uid());
create policy staff_write on public.space_staff for all to authenticated
  using (public.is_admin() or exists (select 1 from public.teacher_spaces s where s.id = space_id and s.owner_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.teacher_spaces s where s.id = space_id and s.owner_id = auth.uid()));

-- ------------------------------------------------------------
-- students : 본인/자녀 + 담당 운영진 읽기 / admin·관리권한 운영진 쓰기
-- ------------------------------------------------------------
create policy students_read  on public.students for select to authenticated
  using (id in (select public.visible_student_ids()) or public.is_staff_of_student(id));
create policy students_write on public.students for all to authenticated
  using (public.is_admin() or exists (
    select 1 from public.enrollments e where e.student_id = id and public.can_manage_students_in(e.space_id)))
  with check (public.is_admin() or exists (
    select 1 from public.enrollments e where e.student_id = id and public.can_manage_students_in(e.space_id)));

-- ------------------------------------------------------------
-- enrollments
-- ------------------------------------------------------------
create policy enrollments_read  on public.enrollments for select to authenticated
  using (public.is_space_staff(space_id) or student_id in (select public.visible_student_ids()));
create policy enrollments_write on public.enrollments for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));

-- ------------------------------------------------------------
-- parents / parent_links
-- ------------------------------------------------------------
create policy parents_read  on public.parents for select to authenticated
  using (profile_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.parent_links pl where pl.parent_id = id and public.is_staff_of_student(pl.student_id)));
create policy parents_write on public.parents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy parent_links_read  on public.parent_links for select to authenticated
  using (public.is_admin()
    or exists (select 1 from public.parents p where p.id = parent_id and p.profile_id = auth.uid())
    or public.is_staff_of_student(student_id));
create policy parent_links_write on public.parent_links for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 공간 콘텐츠 (space_id 직결) : classes/sessions/exams/assignments/notices
--   읽기 = can_read_space, 쓰기 = is_space_staff
-- ------------------------------------------------------------
create policy classes_read  on public.classes for select to authenticated using (public.can_read_space(space_id));
create policy classes_write on public.classes for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));

create policy sessions_read  on public.sessions for select to authenticated using (public.can_read_space(space_id));
create policy sessions_write on public.sessions for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));

create policy exams_read  on public.exams for select to authenticated using (public.can_read_space(space_id));
create policy exams_write on public.exams for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));

create policy assignments_read  on public.assignments for select to authenticated using (public.can_read_space(space_id));
create policy assignments_write on public.assignments for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));

create policy notices_read  on public.notices for select to authenticated using (public.can_read_space(space_id));
create policy notices_write on public.notices for all to authenticated
  using (public.is_space_staff(space_id)) with check (public.is_space_staff(space_id));

-- ------------------------------------------------------------
-- exam_results : 본인/자녀 + 운영진 읽기 / 채점권한 쓰기
-- ------------------------------------------------------------
create policy results_read  on public.exam_results for select to authenticated
  using (student_id in (select public.visible_student_ids())
    or exists (select 1 from public.exams e where e.id = exam_id and public.is_space_staff(e.space_id)));
create policy results_write on public.exam_results for all to authenticated
  using (exists (select 1 from public.exams e where e.id = exam_id and public.can_grade_in(e.space_id)))
  with check (exists (select 1 from public.exams e where e.id = exam_id and public.can_grade_in(e.space_id)));

-- ------------------------------------------------------------
-- submissions : 본인/자녀 + 운영진 읽기 / 운영진 또는 학생 본인 쓰기
-- ------------------------------------------------------------
create policy submissions_read  on public.submissions for select to authenticated
  using (student_id in (select public.visible_student_ids())
    or exists (select 1 from public.assignments a where a.id = assignment_id and public.is_space_staff(a.space_id)));
create policy submissions_write on public.submissions for all to authenticated
  using (student_id in (select public.visible_student_ids())
    or exists (select 1 from public.assignments a where a.id = assignment_id and public.is_space_staff(a.space_id)))
  with check (student_id in (select public.visible_student_ids())
    or exists (select 1 from public.assignments a where a.id = assignment_id and public.is_space_staff(a.space_id)));

-- ------------------------------------------------------------
-- clinics : 본인/자녀 신청 + 운영진 관리
-- ------------------------------------------------------------
create policy clinics_read  on public.clinics for select to authenticated
  using (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id));
create policy clinics_write on public.clinics for all to authenticated
  using (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id))
  with check (student_id in (select public.visible_student_ids()) or public.is_space_staff(space_id));
