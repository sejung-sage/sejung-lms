-- ============================================================
-- 강좌(class) 단위로 데이터 묶기
--
-- 지금까지 시험·숙제·재시험·할 일은 강사 공간(space_id)에만 묶여 있어서,
-- 강사가 강좌를 여러 개 열면 화면마다 반이 섞였다 (다른 반 시험이 0점으로 찍히는 등).
-- class_id 를 직접 달고, 회차(session)에서 거꾸로 채운다.
-- 재시험·할 일은 자동 연쇄 트리거가 만들기 때문에, 들어올 때 원인 시험의 강좌를 따라가게 한다.
-- ============================================================

alter table public.exams       add column if not exists class_id uuid references public.classes (id) on delete cascade;
alter table public.assignments add column if not exists class_id uuid references public.classes (id) on delete cascade;
alter table public.retakes     add column if not exists class_id uuid references public.classes (id) on delete cascade;
alter table public.todos       add column if not exists class_id uuid references public.classes (id) on delete cascade;

create index if not exists exams_class_idx       on public.exams (class_id);
create index if not exists assignments_class_idx on public.assignments (class_id);
create index if not exists retakes_class_idx     on public.retakes (class_id);
create index if not exists todos_class_idx       on public.todos (class_id);

-- 회차에 붙어 있던 것들은 그 회차의 강좌로
update public.exams e set class_id = s.class_id
  from public.sessions s where e.session_id = s.id and e.class_id is null;
update public.assignments a set class_id = s.class_id
  from public.sessions s where a.session_id = s.id and a.class_id is null;

-- 시험이 회차에 안 붙어 있으면 회차를 따라 강좌를 채운다
create or replace function public.exams_fill_class()
returns trigger language plpgsql as $$
begin
  if new.class_id is null and new.session_id is not null then
    select class_id into new.class_id from public.sessions where id = new.session_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_exams_fill_class on public.exams;
create trigger trg_exams_fill_class before insert or update of session_id on public.exams
  for each row execute function public.exams_fill_class();

create or replace function public.assignments_fill_class()
returns trigger language plpgsql as $$
begin
  if new.class_id is null and new.session_id is not null then
    select class_id into new.class_id from public.sessions where id = new.session_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_assignments_fill_class on public.assignments;
create trigger trg_assignments_fill_class before insert or update of session_id on public.assignments
  for each row execute function public.assignments_fill_class();

-- 재시험은 원래 시험의 강좌
create or replace function public.retakes_fill_class()
returns trigger language plpgsql as $$
begin
  if new.class_id is null then
    select class_id into new.class_id from public.exams where id = new.original_exam_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_retakes_fill_class on public.retakes;
create trigger trg_retakes_fill_class before insert on public.retakes
  for each row execute function public.retakes_fill_class();

-- 할 일은 원인(재시험)의 강좌
create or replace function public.todos_fill_class()
returns trigger language plpgsql as $$
begin
  if new.class_id is null and new.source_table = 'retakes' and new.source_id is not null then
    select class_id into new.class_id from public.retakes where id = new.source_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_todos_fill_class on public.todos;
create trigger trg_todos_fill_class before insert on public.todos
  for each row execute function public.todos_fill_class();

update public.retakes r set class_id = e.class_id
  from public.exams e where r.original_exam_id = e.id and r.class_id is null;
update public.todos t set class_id = r.class_id
  from public.retakes r where t.source_table = 'retakes' and t.source_id = r.id and t.class_id is null;
