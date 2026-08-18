-- ============================================================
-- teacher_spaces.accent_color 를 Toss Design System 톤으로 교체
--
-- 이 색은 런처 아이콘 타일과 사이드바/헤더 아바타 위에 "흰 글자"로 올라간다.
-- 기존 값 중 셋은 흰색 대비가 WCAG AA(4.5:1) 미달이었다.
--   #16a34a 3.30:1 / #ea580c 3.56:1 / #0891b2 3.68:1
-- 새 값은 색상(hue)은 유지하면서 명도만 낮춰 전부 4.5:1 이상으로 맞춘 것.
--
-- 멱등: 기존 값과 정확히 일치할 때만 갱신하므로,
--       운영자가 손으로 바꾼 색은 건드리지 않는다.
-- ============================================================

-- 컬럼 기본값 (신규 공간 생성 시)
alter table public.teacher_spaces
  alter column accent_color set default '#1b64da';

-- 시드로 들어간 기존 행만 교체
update public.teacher_spaces as t
set    accent_color = v.new_color
from (values
  ('kim-math',       '#2563eb', '#1b64da'),  -- 5.41:1
  ('park-math',      '#16a34a', '#07835a'),  -- 4.77:1
  ('gloria-eng',     '#9333ea', '#6b4ce0'),  -- 5.62:1
  ('son-kor',        '#ea580c', '#c2410c'),  -- 5.18:1
  ('baek-chem',      '#0891b2', '#12808f'),  -- 4.66:1
  ('quakchers-math', '#db2777', '#d81b60')   -- 4.95:1
) as v(slug, old_color, new_color)
where t.slug = v.slug
  and t.accent_color = v.old_color;
