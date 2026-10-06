-- ============================================================
-- 세정 LMS — 로그인 도입 전 정체성 테이블 정리
--
-- 1) 역할은 app_metadata 에서만 읽는다
--    기존 트리거는 raw_user_meta_data(가입하는 사람이 직접 넣는 값)의 role 을 믿었다.
--    공개 가입 API 로 role=admin 을 넣으면 관리자가 됐다. app_metadata 는 서비스 키로만 쓸 수 있다.
-- 2) 본인 profile 수정 시 role 은 못 바꾼다 (열 단위 권한)
-- 3) profiles.login_id : 학원이 발급한 아이디(학생·학부모) 또는 이메일(운영진). 화면 표시·검색용
-- ============================================================

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
    coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

alter table public.profiles
  add column if not exists login_id text unique;

comment on column public.profiles.login_id is
  '로그인 아이디. 학생·학부모는 학원 발급 아이디, 운영진은 이메일.';
