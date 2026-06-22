import { redirect } from "next/navigation";
import { MobileCalendarClient } from "@/components/mobile-system/MobileCalendarClient";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadCoordinationCalendar } from "@/lib/site-walk/load-calendar-data";

export const metadata = { title: "Calendar — Slate360" };
export const dynamic = "force-dynamic";

export default async function CoordinationCalendarPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination/calendar");

  const events = await loadCoordinationCalendar(ctx.orgId);
  return <MobileCalendarClient events={events} />;
}
