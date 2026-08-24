"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function submitClinicDeparture(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const feedback = String(formData.get("feedback") ?? "").trim();
  if (!token) redirect("/");

  const db = createAdminClient();
  const { data } = await db
    .from("magic_links")
    .select("id, action, target_id, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (!data || data.action !== "clinic_departed" || !data.target_id) {
    redirect(`/l/${token}`);
  }

  if (new Date(data.expires_at).getTime() < Date.now() || data.consumed_at) {
    redirect(`/l/${token}`);
  }

  const now = new Date().toISOString();
  await db
    .from("clinic_reservations")
    .update({
      status: "departed",
      departed_at: now,
      feedback: feedback || null,
      updated_at: now,
    })
    .eq("id", data.target_id)
    .is("departed_at", null);

  await db
    .from("magic_links")
    .update({ consumed_at: now })
    .eq("id", data.id)
    .is("consumed_at", null);

  redirect(`/l/${token}`);
}
