import Link from "next/link";
import { notFound } from "next/navigation";
import { getSpaceBySlug } from "@/lib/spaces";
import { studentContext } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { StudentFrame } from "@/components/student/StudentFrame";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

/** 아직 화면이 없는 메뉴 — 누르면 아무 일도 안 일어나므로 흐리게 둔다 */
const SOON = ["출결 내역", "알림 설정", "학부모 연결"];

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

const row = "flex w-full items-center justify-between px-5 py-4 text-left text-[15px] font-medium transition-colors";

export default async function StudentMyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const space = await getSpaceBySlug(slug);
  if (!space) notFound();
  const ctx = await studentContext(space, slug);

  return (
    <StudentFrame space={space} slug={slug} active="my" pageLabel="마이" preview={ctx.preview}>
      <Card className="mt-1 flex items-center gap-3.5">
        <div
          className="flex size-14 items-center justify-center rounded-full text-[20px] font-bold text-white"
          style={{ backgroundColor: space.accent_color }}
        >
          {ctx.student.name.charAt(0)}
        </div>
        <div>
          <div className="text-[18px] font-bold text-grey-900">{ctx.student.name}</div>
          <div className="text-[13px] text-grey-500">
            {space.subject}
            {!ctx.preview && ctx.viewer.loginId ? ` · 아이디 ${ctx.viewer.loginId}` : ""}
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <ul className="divide-y divide-grey-100">
          <li>
            <Link href="/account" className={`${row} text-grey-800 hover:bg-grey-50`}>
              비밀번호 바꾸기
              <span className="text-grey-300"><Chevron /></span>
            </Link>
          </li>
          {SOON.map((m) => (
            <li key={m} className={`${row} text-grey-400`}>
              {m}
              <span className="text-[12px]">준비 중</span>
            </li>
          ))}
          <li>
            <form action={signOut}>
              <button type="submit" className={`${row} text-red-500 hover:bg-grey-50`}>로그아웃</button>
            </form>
          </li>
        </ul>
      </Card>
    </StudentFrame>
  );
}
