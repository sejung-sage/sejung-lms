"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import {
  ensureStaffAccount, grantTeacherSpace, revokeTeacherSpace, setTeacherManage, createSpace, resetStaffPassword,
} from "@/lib/staff";

/**
 * 학원 관리자(HQ) 전용 — 강사 계정과 공간 권한.
 * 모든 액션이 처음에 admin 인지 다시 확인한다. 화면에서 버튼을 숨기는 것만으로는 막히지 않는다.
 */

export type StaffActionState = {
  ok: boolean;
  message: string;
  credential?: { name: string; email: string; password: string };
  at?: number;
};

const fail = (message: string): StaffActionState => ({ ok: false, message, at: Date.now() });

async function isHq() {
  const v = await getViewer();
  return !!v && !v.mustChangePassword && v.isAdmin;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** 강사 등록 — 계정을 만들고(이미 있으면 찾고) 공간 권한을 준다. 새 공간을 같이 만들 수도 있다 */
export async function registerTeacher(_prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  try {
    let spaceId = str(form, "spaceId");
    if (spaceId === "new") {
      spaceId = await createSpace({
        name: str(form, "spaceName"), subject: str(form, "subject"), slug: str(form, "slug"), accent: str(form, "accent"),
      });
    }
    const acc = await ensureStaffAccount(str(form, "email"), str(form, "name"), "teacher");
    if (spaceId) await grantTeacherSpace(acc.userId, spaceId, true);
    revalidatePath("/hq");
    revalidatePath("/");
    return {
      ok: true,
      at: Date.now(),
      message: acc.created ? `${acc.name} 강사 계정을 만들었어요` : `${acc.name} 강사에게 공간 권한을 추가했어요 (기존 계정)`,
      credential: acc.password ? { name: acc.name, email: acc.email, password: acc.password } : undefined,
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "등록하지 못했어요");
  }
}

export async function grantSpace(userId: string, _prev: StaffActionState, form: FormData): Promise<StaffActionState> {
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  const spaceId = str(form, "spaceId");
  if (!spaceId) return fail("공간을 골라 주세요");
  try {
    await grantTeacherSpace(userId, spaceId, true);
    revalidatePath("/hq");
    return { ok: true, message: "권한을 줬어요", at: Date.now() };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "권한을 주지 못했어요");
  }
}

export async function revokeSpace(userId: string, spaceId: string): Promise<void> {
  if (!(await isHq())) return;
  await revokeTeacherSpace(userId, spaceId);
  revalidatePath("/hq");
}

export async function toggleManage(userId: string, spaceId: string, canManage: boolean): Promise<void> {
  if (!(await isHq())) return;
  await setTeacherManage(userId, spaceId, canManage);
  revalidatePath("/hq");
}

export async function resetTeacherPassword(userId: string, name: string, email: string, _prev: StaffActionState): Promise<StaffActionState> {
  void _prev;
  if (!(await isHq())) return fail("학원 관리자만 할 수 있어요");
  try {
    const password = await resetStaffPassword(userId);
    return { ok: true, message: "임시 비밀번호를 새로 만들었어요", credential: { name, email, password }, at: Date.now() };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "초기화하지 못했어요");
  }
}
