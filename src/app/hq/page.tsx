import Link from "next/link";
import { redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { getHqOverview } from "@/lib/staff";
import { signOut } from "@/app/login/actions";
import { Card, CardTitle } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { CountPill } from "@/components/ui/Chip";
import { RegisterTeacherForm } from "@/components/hq/RegisterTeacherForm";
import { TeacherTable } from "@/components/hq/TeacherTable";

export const dynamic = "force-dynamic";

const CONTAINER = "mx-auto w-full max-w-6xl px-5";

/** 학원 관리자(마스터) — 강사 계정을 만들고 강사 공간 권한을 준다 */
export default async function HqPage() {
  const viewer = await requireLogin("/hq");
  if (!viewer.isAdmin) redirect("/");
  const { teachers, spaces } = await getHqOverview();

  return (
    <div className="min-h-dvh bg-panel text-grey-900">
      <header className="sticky top-0 z-10 border-b border-grey-200 bg-white">
        <div className={`${CONTAINER} flex items-center justify-between py-3.5`}>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex size-9 items-center justify-center rounded-md bg-grey-900 text-[14px] font-bold text-white">세</Link>
            <div className="leading-tight">
              <h1 className="text-[19px] font-bold">학원 관리</h1>
              <p className="text-[12.5px] text-grey-500">강사 계정 · 공간 권한</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/" variant="secondary" size="sm">강사 공간 목록</ButtonLink>
            <form action={signOut}>
              <button type="submit" className="h-9 px-2 text-[13px] font-semibold text-grey-500 hover:text-red-500">로그아웃</button>
            </form>
          </div>
        </div>
      </header>

      <main className={`${CONTAINER} space-y-4 py-5`}>
        <Card>
          <CardTitle>강사 등록</CardTitle>
          <div className="mt-3">
            <RegisterTeacherForm spaces={spaces.map((s) => ({ id: s.id, name: s.name, ownerName: s.ownerName }))} />
          </div>
        </Card>

        <Card padded={false}>
          <div className="flex items-center gap-2 border-b border-grey-200 px-4 py-3">
            <span className="text-[15px] font-bold">강사</span>
            <CountPill>{teachers.length}</CountPill>
            <span className="ml-auto text-[12.5px] text-grey-500">
              주 강사 = 공간 전체 권한 · 공동 강사는 &lsquo;관리&rsquo;를 눌러 학생 관리 권한을 켜고 끔
            </span>
          </div>
          <TeacherTable teachers={teachers} spaces={spaces.map((s) => ({ id: s.id, name: s.name }))} />
        </Card>

        <Card padded={false}>
          <div className="flex items-center gap-2 border-b border-grey-200 px-4 py-3">
            <span className="text-[15px] font-bold">강사 공간</span>
            <CountPill>{spaces.length}</CountPill>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-grey-100">
                <tr className="text-left text-[12.5px] font-semibold text-grey-600">
                  <th className="px-4 py-2.5">공간</th><th className="px-3 py-2.5">주 강사</th>
                  <th className="px-3 py-2.5 text-right">강좌</th><th className="px-3 py-2.5 text-right">재원생</th>
                  <th className="px-3 py-2.5 text-right">조교</th><th className="px-4 py-2.5 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-100 text-[13.5px]">
                {spaces.map((s) => (
                  <tr key={s.id}>
                    <td className="h-12 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-sm text-[12px] font-bold text-white" style={{ backgroundColor: s.accent }}>
                          {s.name.charAt(0)}
                        </span>
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-grey-500">{s.subject}</span>
                      </div>
                    </td>
                    <td className="px-3 text-grey-700">{s.ownerName ?? <span className="text-amber-500">미지정</span>}</td>
                    <td className="num px-3 text-right">{s.classCount}</td>
                    <td className="num px-3 text-right">{s.studentCount}</td>
                    <td className="num px-3 text-right">{s.assistantCount}</td>
                    <td className="px-4 text-right">
                      {s.slug && <ButtonLink href={`/s/${s.slug}`} variant="ghost" size="xs">들어가기</ButtonLink>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
