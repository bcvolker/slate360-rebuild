import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { CoordinationHubShell } from "@/components/coordination/CoordinationHubShell";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import GlassCard from "@/components/shared/GlassCard";

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
      <GlassCard className="py-12 text-center border-dashed">
        <CalendarDays className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 text-sm font-black text-slate-300">No events scheduled</p>
        <p className="mt-1 text-xs text-slate-500">Deadlines, inspections, and milestones across your projects will appear here.</p>
      </GlassCard>
    </CoordinationHubShell>
  );
}
