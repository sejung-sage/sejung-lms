-- ============================================================
-- 세정 LMS — 디지털 OMR 입력
--
-- 학생이 폰으로 답을 마킹하거나, 조교가 학생별 답을 키패드로 입력하면
-- exam_answers(문항별) → exam_results(합계) 로 쓰고, 나머지는 기존 트리거가 한다.
--   trg_recompute_exam_stats      : 평균·표준편차·등수
--   trg_enqueue_retake_for_result : 커트라인 미달 → 재시험 + 할 일
--
-- 여기서 추가하는 건 "학생이 지금 이 시험에 답을 낼 수 있는가" 플래그 하나다.
-- score_status(성적 공개 여부)와는 별개다 — 제출은 열고 성적은 닫아둘 수 있어야 한다.
-- ============================================================

alter table public.exams
  add column if not exists omr_open boolean not null default false;

comment on column public.exams.omr_open is
  '학생 앱에서 OMR 답안 제출을 받는 중인가. 조교 대리 입력은 이 값과 무관하게 가능.';
