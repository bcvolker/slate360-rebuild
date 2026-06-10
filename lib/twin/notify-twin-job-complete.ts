import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

function formatTwinNotificationLabel(
  spaceTitle: string | null | undefined,
  referenceDate: string,
): string {
  const trimmed = spaceTitle?.trim();
  if (trimmed && !/^Quick Scan/i.test(trimmed)) {
    return trimmed;
  }

  const dateLabel = new Date(referenceDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `Quick scan · ${dateLabel}`;
}

type NotifyTwinJobOutcomeInput = {
  admin: AdminClient;
  userId: string;
  projectId: string;
  spaceId: string;
  spaceTitle: string | null;
  referenceDate: string;
  outcome: "completed" | "failed";
};

export async function notifyTwinJobOutcome(input: NotifyTwinJobOutcomeInput): Promise<void> {
  try {
    const label = formatTwinNotificationLabel(input.spaceTitle, input.referenceDate);
    const completed = input.outcome === "completed";

    await input.admin.from("project_notifications").insert({
      user_id: input.userId,
      project_id: input.projectId,
      title: completed ? "Your twin is ready" : "Your scan couldn't be processed",
      message: completed
        ? `${label} is ready to view.`
        : `${label} could not be processed. Open review to try again.`,
      link_path: completed
        ? `/digital-twin/twins/${input.spaceId}`
        : "/digital-twin/capture/review",
      is_read: false,
    });
  } catch (err) {
    console.error("[notify-twin-job]", err);
  }
}
