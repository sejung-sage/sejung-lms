import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST 빌더 체인은 제네릭이 너무 깊어서 여기만 느슨하게 */
type Builder = any;

/**
 * PostgREST 는 한 번에 1000행까지만 준다. ERP 데이터(강좌 2천여 개, 수강 1만여 건)를 다루는
 * 화면은 이걸로 끝까지 읽는다 — 안 그러면 숫자가 1000에서 조용히 잘린다.
 */
export async function selectAll<T>(table: string, select: string, filter: (q: Builder) => Builder = (q) => q): Promise<T[]> {
  const db = createAdminClient();
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(select)).range(from, from + 999);
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if ((data ?? []).length < 1000) return out;
  }
}

/** in(...) 조건이 너무 길어지지 않게 나눠서 */
export function chunk<T>(arr: T[], n = 200): T[][] {
  return Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
}
