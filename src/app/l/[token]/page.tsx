import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitClinicDeparture } from "./actions";

export const dynamic = "force-dynamic";

type MagicLink = {
  id: string;
  token: string;
  action: "clinic_arrived" | "clinic_departed" | "report" | "todo" | "qna" | "survey" | "temp_login";
  target_id: string | null;
  payload: Record<string, unknown>;
  expires_at: string;
  consumed_at: string | null;
  view_count: number;
  teacher_spaces: { name: string; accent_color: string } | { name: string; accent_color: string }[] | null;
  students: { name: string } | { name: string }[] | null;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

const ACTION_COPY: Record<MagicLink["action"], { title: string; done: string; pending: string; write: boolean }> = {
  clinic_arrived: {
    title: "클리닉 등원 처리",
    done: "등원 처리가 완료되었습니다.",
    pending: "이 링크는 클리닉 예약의 등원 시간을 기록합니다.",
    write: true,
  },
  clinic_departed: {
    title: "클리닉 하원 처리",
    done: "하원 처리가 완료되었습니다.",
    pending: "이 링크는 클리닉 예약의 하원 시간을 기록합니다.",
    write: true,
  },
  report: { title: "성적표", done: "성적표를 불러왔습니다.", pending: "성적표 열람 링크입니다.", write: false },
  todo: { title: "할 일", done: "할 일을 불러왔습니다.", pending: "학생 할 일 열람 링크입니다.", write: false },
  qna: { title: "질의응답", done: "답변을 불러왔습니다.", pending: "질의응답 확인 링크입니다.", write: false },
  survey: { title: "설문", done: "설문 응답 화면입니다.", pending: "설문 응답 링크입니다.", write: true },
  temp_login: { title: "임시 로그인", done: "임시 로그인 링크입니다.", pending: "임시 로그인 링크입니다.", write: true },
};

async function processLink(link: MagicLink) {
  const db = createAdminClient();
  const copy = ACTION_COPY[link.action];
  const expired = new Date(link.expires_at).getTime() < Date.now();

  if (expired) return { status: "expired" as const, message: "만료된 링크입니다." };

  await db
    .from("magic_links")
    .update({ view_count: link.view_count + 1, last_viewed_at: new Date().toISOString() })
    .eq("id", link.id);

  if (!copy.write) return { status: "read" as const, message: copy.done };
  if (link.consumed_at) return { status: "consumed" as const, message: "이미 처리된 링크입니다." };

  if (link.action === "clinic_departed") {
    return { status: "form" as const, message: "하원 피드백을 작성한 뒤 처리하세요." };
  }

  if (link.action === "clinic_arrived" && link.target_id) {
    const now = new Date().toISOString();

    const { error } = await db
      .from("clinic_reservations")
      .update({ status: "arrived", arrived_at: now, updated_at: now })
      .eq("id", link.target_id)
      .is("arrived_at", null);

    if (error) return { status: "error" as const, message: "처리 중 오류가 발생했습니다." };
  }

  await db.from("magic_links").update({ consumed_at: new Date().toISOString() }).eq("id", link.id);
  return { status: "done" as const, message: copy.done };
}

/** 링크 처리 결과 — 색과 문구를 한곳에서 같이 정한다.
    (색만 계산하고 라벨은 "상태"라는 리터럴을 찍고 있었다) */
const LINK_STATUS: Record<string, { label: string; cls: string }> = {
  done:     { label: "처리 완료", cls: "bg-green-50 text-green-500" },
  read:     { label: "열람 완료", cls: "bg-green-50 text-green-500" },
  consumed: { label: "처리됨",   cls: "bg-grey-100 text-grey-600" },
  form:     { label: "확인 필요", cls: "bg-amber-50 text-amber-500" },
  expired:  { label: "만료됨",   cls: "bg-red-50 text-red-500" },
  error:    { label: "오류",     cls: "bg-red-50 text-red-500" },
};

function StatusBadge({ status }: { status: string }) {
  const s = LINK_STATUS[status] ?? { label: status, cls: "bg-grey-100 text-grey-600" };
  return (
    <span className={`shrink-0 rounded-xs px-2.5 py-1 text-[12px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default async function MagicLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = createAdminClient();
  const { data } = await db
    .from("magic_links")
    .select("id, token, action, target_id, payload, expires_at, consumed_at, view_count, teacher_spaces(name, accent_color), students(name)")
    .eq("token", token)
    .maybeSingle();

  if (!data) notFound();

  const link = data as MagicLink;
  const copy = ACTION_COPY[link.action];
  const result = await processLink(link);
  const space = one(link.teacher_spaces);
  const student = one(link.students);

  return (
    <main className="min-h-screen bg-panel px-5 py-10 text-grey-900">
      <section className="mx-auto max-w-[420px] rounded-card border border-grey-200 bg-white p-6">
        <div
          className="mb-5 flex size-12 items-center justify-center rounded-md text-[17px] font-bold text-white"
          style={{ backgroundColor: space?.accent_color ?? "#1b64da" }}
        >
          {(space?.name ?? "세정").charAt(0)}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-bold tracking-[-0.03em]">{copy.title}</h1>
          <StatusBadge status={result.status} />
        </div>
        <p className="mt-3 text-[15px] leading-[1.7] text-grey-600">{result.message}</p>
        {result.status === "form" && (
          <form action={submitClinicDeparture} className="mt-5">
            <input type="hidden" name="token" value={token} />
            <label htmlFor="feedback" className="mb-2 block text-[13px] font-semibold text-grey-700">
              조교 피드백
            </label>
            <textarea
              id="feedback"
              name="feedback"
              rows={5}
              className="w-full resize-none rounded-md border border-grey-200 bg-white px-3 py-2.5 text-[14px] leading-[1.6] text-grey-900 outline-none transition-colors placeholder:text-grey-400 focus:border-blue-500"
              placeholder="오늘 클리닉에서 확인한 내용과 학부모에게 전달할 피드백을 적어주세요."
            />
            <button
              type="submit"
              className="mt-3 h-11 w-full rounded-btn bg-blue-500 text-[15px] font-bold text-white transition-colors hover:bg-blue-600"
            >
              하원 처리
            </button>
          </form>
        )}
        <div className="mt-5 divide-y divide-grey-100 border-t border-grey-100 pt-2">
          <div className="flex justify-between py-2 text-[14px]">
            <span className="text-grey-500">공간</span>
            <span className="font-medium">{space?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2 text-[14px]">
            <span className="text-grey-500">학생</span>
            <span className="font-medium">{student?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2 text-[14px]">
            <span className="text-grey-500">만료</span>
            <span className="num font-medium">{link.expires_at.slice(0, 10)}</span>
          </div>
        </div>
        <p className="mt-5 text-[12px] leading-[1.6] text-grey-400">{copy.pending}</p>
      </section>
    </main>
  );
}
