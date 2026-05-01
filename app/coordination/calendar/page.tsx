import { redirect } from "next/navigation";
import { BellRing, CalendarClock, CalendarDays, Smartphone } from "lucide-react";
import { CoordinationHubShell } from "@/components/coordination/CoordinationHubShell";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Calendar — Slate360" };
export const dynamic = "force-dynamic";

export default async function CoordinationCalendarPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination/calendar");

  return (
    <CoordinationHubShell
      active="calendar"
      eyebrow="Coordination Hub"
      title="Calendar Management"
      description="The schedule layer should connect iOS/Android calendars, Site Walk appointments, project milestones, reminders, and schedule-aware higher-tier field workflows."
    >
      <section className="grid gap-3 lg:grid-cols-3">
        <CalendarCard icon={Smartphone} title="Device Calendar Sync" detail="Use iCalendar/CalDAV-ready links first, then native Google/Microsoft calendar OAuth where required." />
        <CalendarCard icon={CalendarClock} title="Schedule Assistant" detail="Suggest Site Walk time windows based on user availability, project milestones, and stakeholder calendars." />
        <CalendarCard icon={BellRing} title="Reminder Routing" detail="Send reminders into the Communication Inbox, email, and optional device calendar alerts." />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md">
        <h2 className="text-sm font-black text-white">Recommended V1 integration path</h2>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
          <li><strong>1.</strong> Generate per-user calendar feeds for Site Walk sessions and project milestones.</li>
          <li><strong>2.</strong> Add Google Calendar and Microsoft 365 OAuth for two-way sync.</li>
          <li><strong>3.</strong> iPhone and Android support comes through those calendar providers plus installable calendar links.</li>
          <li><strong>4.</strong> Higher-tier Site Walk can use schedule awareness to warn before starting walks outside planned windows.</li>
        </ol>
      </section>
    </CoordinationHubShell>
  );
}

function CalendarCard({ icon: Icon, title, detail }: { icon: typeof CalendarDays; title: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md">
      <Icon className="h-5 w-5 text-blue-200" />
      <h2 className="mt-3 text-sm font-black text-white">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}
