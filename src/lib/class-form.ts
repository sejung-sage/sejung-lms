/**
 * 강좌 개설·수정 폼 → classes row. HQ 와 강사 화면이 같은 규칙을 쓴다.
 * (서버 액션 파일이 아니라 일반 모듈 — "use server" 파일은 async 함수만 내보낼 수 있다)
 */

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => {
  const v = str(f, k).replace(/[^\d]/g, "");
  return v ? Number(v) : null;
};

export function parseClassForm(form: FormData) {
  const title = str(form, "title");
  if (!title) throw new Error("강좌명을 적어 주세요");
  const subject = str(form, "subject");
  if (!subject) throw new Error("과목을 골라 주세요");

  const days = form.getAll("slotDay").map(String);
  const starts = form.getAll("slotStart").map(String);
  const ends = form.getAll("slotEnd").map(String);
  const rooms = form.getAll("slotRoom").map(String);
  const slots = days
    .map((weekday, i) => ({ weekday, start_time: starts[i] ?? "", end_time: ends[i] ?? "", room_name: (rooms[i] ?? "").trim() || null }))
    .filter((s) => s.weekday || s.start_time || s.end_time);
  for (const s of slots) {
    if (!WEEKDAYS.includes(s.weekday)) throw new Error("수업 요일을 골라 주세요");
    if (!TIME.test(s.start_time) || !TIME.test(s.end_time) || s.end_time <= s.start_time) throw new Error("수업 시간을 확인해 주세요 (예: 18:00–20:00)");
  }

  const startsOn = str(form, "startsOn") || null;
  const endsOn = str(form, "endsOn") || null;
  if (startsOn && endsOn && endsOn < startsOn) throw new Error("종강일이 개강일보다 빨라요");

  return {
    title,
    subject,
    subject_detail: str(form, "subjectDetail") || null,
    kind: str(form, "kind") === "special" ? "special" : "regular",
    description: str(form, "description") || null,
    starts_on: startsOn,
    ends_on: endsOn,
    total_sessions: int(form, "totalSessions"),
    price_per_session: int(form, "pricePerSession"),
    capacity: int(form, "capacity"),
    is_closed: form.get("isClosed") === "on",
    slots,
  };
}
