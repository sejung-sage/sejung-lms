-- ============================================================
-- 세정 LMS — 시드 데이터 (데모/개발용)
-- 멱등(idempotent): 여러 번 실행해도 중복 안 생기도록 on conflict 처리.
-- 로컬: supabase db reset 시 자동 실행. 원격: 수동 적용.
-- ============================================================

-- 지점
insert into public.branches (name) values
  ('대치'), ('반포'), ('방배'), ('송도')
on conflict (name) do nothing;

-- 쌤 공간 (HM 런처 아이콘) — PRD 12p 목업 기준
-- slug 로 멱등 처리. owner_id 는 auth 붙기 전이라 비움.
with b as (select id from public.branches where name = '대치')
insert into public.teacher_spaces (branch_id, name, subject, slug, accent_color, sort_order)
select b.id, v.name, v.subject, v.slug, v.color, v.sort
from b, (values
  -- accent_color: TDS 톤 + 흰 글자 대비 4.5:1 이상 (마이그레이션 …_tds_accent_colors 참고)
  ('김쌤',     '수학', 'kim-math',      '#1b64da', 1),
  ('박쌤',     '수학', 'park-math',     '#07835a', 2),
  ('글로리아', '영어', 'gloria-eng',    '#6b4ce0', 3),
  ('손쌤',     '국어', 'son-kor',       '#c2410c', 4),
  ('백신',     '화학', 'baek-chem',     '#12808f', 5),
  ('꽉처스',   '수학', 'quakchers-math','#d81b60', 6)
) as v(name, subject, slug, color, sort)
on conflict (slug) do nothing;
