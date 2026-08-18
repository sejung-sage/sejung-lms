// 세정 LMS — psql 없이 돌리는 시드 (supabase-js + service_role).
// 실행: node --env-file=.env.local supabase/seed.mjs
// 멱등: branches.name / teacher_spaces.slug 기준 upsert.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const BRANCHES = ["대치", "반포", "방배", "송도"];
// accent_color: TDS 톤 + 흰 글자 대비 4.5:1 이상 (마이그레이션 …_tds_accent_colors 참고)
const SPACES = [
  { name: "김쌤", subject: "수학", slug: "kim-math", accent_color: "#1b64da", sort_order: 1 },
  { name: "박쌤", subject: "수학", slug: "park-math", accent_color: "#07835a", sort_order: 2 },
  { name: "글로리아", subject: "영어", slug: "gloria-eng", accent_color: "#6b4ce0", sort_order: 3 },
  { name: "손쌤", subject: "국어", slug: "son-kor", accent_color: "#c2410c", sort_order: 4 },
  { name: "백신", subject: "화학", slug: "baek-chem", accent_color: "#12808f", sort_order: 5 },
  { name: "꽉처스", subject: "수학", slug: "quakchers-math", accent_color: "#d81b60", sort_order: 6 },
];

const { error: bErr } = await db
  .from("branches")
  .upsert(BRANCHES.map((name) => ({ name })), { onConflict: "name" });
if (bErr) throw bErr;

const { data: daechi, error: dErr } = await db
  .from("branches").select("id").eq("name", "대치").single();
if (dErr) throw dErr;

const { error: sErr } = await db
  .from("teacher_spaces")
  .upsert(SPACES.map((s) => ({ ...s, branch_id: daechi.id })), { onConflict: "slug" });
if (sErr) throw sErr;

const { count: spaces } = await db
  .from("teacher_spaces").select("*", { count: "exact", head: true });
const { count: branches } = await db
  .from("branches").select("*", { count: "exact", head: true });
console.log(`seed OK — branches: ${branches}, teacher_spaces: ${spaces}`);
