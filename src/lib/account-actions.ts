"use server";

import { revalidatePath } from "next/cache";
import { getSpaceBySlug } from "@/lib/spaces";
import { staffForAction } from "@/lib/auth";
import {
  getAccountRoster, issueAccount, resetAccountPassword, type IssuedCredential,
} from "@/lib/accounts";

/**
 * 계정 발급·초기화는 학생 관리 권한(can_manage_students)이 있는 운영진만.
 * 대상은 항상 '이 공간 명단'에서 다시 찾는다 — 화면에서 보낸 id 를 그대로 믿지 않는다.
 */

export type AccountActionState = { ok: boolean; message: string; issued: IssuedCredential[] };

const fail = (message: string): AccountActionState => ({ ok: false, message, issued: [] });

async function guard(slug: string) {
  const space = await getSpaceBySlug(slug);
  if (!space?.id) return null;
  const st = await staffForAction(space.id);
  if (!st?.grant.canManage) return null;
  return space;
}

export async function issueMissingAccounts(slug: string, _prev: AccountActionState): Promise<AccountActionState> {
  void _prev;
  const space = await guard(slug);
  if (!space) return fail("학생 관리 권한이 없어요");

  const missing = (await getAccountRoster(space.id)).filter((r) => !r.profileId);
  if (!missing.length) return fail("새로 발급할 계정이 없어요");

  const issued: IssuedCredential[] = [];
  const errors: string[] = [];
  for (const row of missing) {
    try {
      issued.push(await issueAccount(row));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : row.name);
    }
  }
  revalidatePath(`/s/${slug}/admin/students`);
  return {
    ok: issued.length > 0,
    message: `${issued.length}개 발급` + (errors.length ? ` · 실패 ${errors.length}개: ${errors[0]}` : ""),
    issued,
  };
}

export async function resetPassword(
  slug: string, kind: "student" | "parent", id: string, _prev: AccountActionState,
): Promise<AccountActionState> {
  void _prev;
  const space = await guard(slug);
  if (!space) return fail("학생 관리 권한이 없어요");

  const row = (await getAccountRoster(space.id)).find((r) => r.kind === kind && r.id === id);
  if (!row) return fail("이 공간 명단에 없는 사람이에요");
  try {
    const cred = await resetAccountPassword(row);
    return { ok: true, message: `${row.name} 임시 비밀번호를 새로 만들었어요`, issued: [cred] };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "초기화하지 못했어요");
  }
}
