import { redirect } from "next/navigation";
import { CoordinationHubShell } from "@/components/coordination/CoordinationHubShell";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { CalendarClient } from "@/components/coordination/CalendarClient";

export const metadata = { title: "Calendar — Slate360" };
export const dynamic = "force-dynamic";

export default async function CoordinationCalendarPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination/calendar");

  return (
    <CoordinationHubShell
      active="calendar"
      eyebrow="Coordination"
      title="Calendar"
    >
      <CalendarClient />
    </CoordinationHubShell>
  );
}
