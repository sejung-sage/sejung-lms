import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmClinicArrival, submitClinicDeparture } from "./actions";
import { ViewBeacon } from "./ViewBeacon";

export const dynamic = "force-dynamic";

// 매직링크는 검색에 잡히면 안 된다.
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Action = "clinic_arrived" | "clinic_departed" | "report" | "todo" | "qna" | "survey" | "temp_login";

type MagicLink = {
  id: string;
  token: string;
  action: Action;
  target_id: string | null;
  payload: Record<string, unknown>;
  expires_at: string;
  consumed_at: string | null;
  view_count: number;
  teacher_spaces: { name: string; accent_color: string } | { name: string; accent_color: string }[] | null;
  students: { name: string } | { name: string }[] | null;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/**
 * kind
 *   read  — 열기만 해도 되는 링크 (성적표·할 일·질의응답)
 *   write — 상태를 바꾸는 링크. 반드시 버튼(POST)을 거친다.
 * handled
 *   write 인데 아직 처리기가 없는 것(설문·임시로그인)을 구분한다.
 *   없는 처리를 '완료'라고 말하지 않기 위해서.
 */
const ACTION_COPY: Record<
  Action,
  { title: string; kind: "read" | "write"; handled: boolean; prompt: string; done: string; cta?: string; note: string }
> = {
  clinic_arrived: {
    title: "클리닉 등원 처리",
    kind: "write", handled: true,
    prompt: "학생이 도착했으면 아래 버튼을 눌러주세요.",
    done: "등원 처리가 완료되었습니다.",
    cta: "등원 처리하기",
    note: "버튼을 눌러야 등원 시간이 기록됩니다.",
  },
  clinic_departed: {
    title: "클리닉 하원 처리",
    kind: "write", handled: true,
    prompt: "하원 피드백을 작성한 뒤 처리하세요.",
    done: "하원 처리가 완료되었습니다.",
    cta: "하원 처리",
    note: "작성한 피드백은 학부모에게 전달됩니다.",
  },
  report:  { title: "성적표",   kind: "read", handled: true, prompt: "", done: "성적표 열람 링크입니다.",   note: "링크는 만료일까지 다시 열 수 있습니다." },
  todo:    { title: "할 일",    kind: "read", handled: true, prompt: "", done: "학생 할 일 열람 링크입니다.", note: "링크는 만료일까지 다시 열 수 있습니다." },
  qna:     { title: "질의응답", kind: "read", handled: true, prompt: "", done: "질의응답 확인 링크입니다.",   note: "링크는 만료일까지 다시 열 수 있습니다." },
  survey:  { title: "설문",     kind: "write", handled: false, prompt: "", done: "", note: "설문 응답 화면은 준비 중입니다." },
  temp_login: { title: "임시 로그인", kind: "write", handled: false, prompt: "", done: "", note: "임시 로그인은 준비 중입니다." },
};

type View =
  | { status: "expired"; message: string }
  | { status: "consumed"; message: string }
  | { status: "ready"; message: string }
  | { status: "read"; message: string }
  | { status: "unsupported"; message: string };

/**
 * 화면 상태만 계산한다 — DB 를 쓰지 않는다.
 *
 * 예전에는 이 자리에서 등원 기록과 consumed_at 갱신을 했다.
 * 알림톡 링크는 미리보기 봇·스캐너가 먼저 GET 을 날리기 때문에,
 * 학생이 오기 전에 등원 처리가 끝나 있는 일이 생긴다.
 */
function resolveView(link: MagicLink): View {
  const copy = ACTION_COPY[link.action];

  if (new Date(link.expires_at).getTime() < Date.now()) {
    return { status: "expired", message: "만료된 링크입니다. 담당 선생님께 문의해 주세요." };
  }
  if (!copy.handled) {
    return { status: "unsupported", message: copy.note };
  }
  if (copy.kind === "read") {
    return { status: "read", message: copy.done };
  }
  if (link.consumed_at) {
    return { status: "consumed", message: "이미 처리된 링크입니다." };
  }
  return { status: "ready", message: copy.prompt };
}

const LINK_STATUS: Record<View["status"], { label: string; cls: string }> = {
  ready:       { label: "확인 필요", cls: "bg-amber-50 text-amber-500" },
  read:        { label: "열람 완료", cls: "bg-green-50 text-green-500" },
  consumed:    { label: "처리됨",   cls: "bg-grey-100 text-grey-600" },
  expired:     { label: "만료됨",   cls: "bg-red-50 text-red-500" },
  unsupported: { label: "준비 중",  cls: "bg-grey-100 text-grey-600" },
};

function StatusBadge({ status }: { status: View["status"] }) {
  const s = LINK_STATUS[status];
  return (
    <span className={`shrink-0 rounded-xs px-2.5 py-1 text-[12px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

const CTA =
  "mt-3 h-11 w-full rounded-btn bg-blue-500 text-[15px] font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700";

export default async function MagicLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const db = createAdminClient();
  const { data } = await db
    .from("magic_links")
    .select(
      "id, token, action, target_id, payload, expires_at, consumed_at, view_count, teacher_spaces(name, accent_color), students(name)",
    )
    .eq("token", token)
    .maybeSingle();

  if (!data) notFound();

  const link = data as MagicLink;
  const copy = ACTION_COPY[link.action];
  const view = resolveView(link);
  const space = one(link.teacher_spaces);
  const student = one(link.students);

  return (
    <main className="min-h-screen bg-panel px-5 py-10 text-grey-900">
      {/* 열람 집계는 클라이언트에서. 렌더 중에는 아무것도 쓰지 않는다. */}
      <ViewBeacon token={token} />

      <section className="mx-auto max-w-[420px] rounded-card border border-grey-200 bg-white p-6">
        <div
          className="mb-5 flex size-12 items-center justify-center rounded-md text-[17px] font-bold text-white"
          style={{ backgroundColor: space?.accent_color ?? "#1b64da" }}
        >
          {(space?.name ?? "세정").charAt(0)}
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-bold tracking-[-0.03em]">{copy.title}</h1>
          <StatusBadge status={view.status} />
        </div>
        <p className="mt-3 text-[15px] leading-[1.7] text-grey-600">{view.message}</p>

        {view.status === "ready" && link.action === "clinic_arrived" && (
          <form action={confirmClinicArrival} className="mt-5">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className={CTA}>
              {copy.cta}
            </button>
          </form>
        )}

        {view.status === "ready" && link.action === "clinic_departed" && (
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
            <button type="submit" className={CTA}>
              {copy.cta}
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

        <p className="mt-5 text-[12px] leading-[1.6] text-grey-400">{copy.note}</p>
      </section>
    </main>
  );
}
