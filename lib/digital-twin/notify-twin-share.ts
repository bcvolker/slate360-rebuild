import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type NotifyTwinShareInput = {
  spaceId: string;
  recipientUserId: string;
  title: string;
  message: string;
};

export async function notifyTwinShareActivity(input: NotifyTwinShareInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: space } = await admin
      .from("digital_twin_spaces")
      .select("project_id")
      .eq("id", input.spaceId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!space?.project_id) return;

    await admin.from("project_notifications").insert({
      user_id: input.recipientUserId,
      project_id: space.project_id,
      title: input.title,
      message: input.message,
      link_path: `/digital-twin/twins/${input.spaceId}`,
      is_read: false,
    });
  } catch (err) {
    console.error("[notify-twin-share] failed", err);
  }
}
