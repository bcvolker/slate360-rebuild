"use client";

import { CalendarDays, MapPin, Flag, Plus } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

const EVENTS = [
  { id: "1", type: "walk", title: "Quarterly Site Inspection", date: "Tomorrow, 10:00 AM", location: "Downtown Plaza", project: "Project Alpha" },
  { id: "2", type: "milestone", title: "Foundation Complete", date: "Friday, 5:00 PM", project: "Project Beta" },
  { id: "3", type: "walk", title: "Initial Onboarding Walk", date: "Next Monday, 9:00 AM", location: "Westside Marina", project: "Project Gamma" },
  { id: "4", type: "milestone", title: "Roofing Approval", date: "Next Wednesday", project: "Project Alpha" },
];

export function CalendarClient() {
  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-slate-400" /> Upcoming Agenda
        </h2>
        <button className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 transition-colors">
          <Plus className="h-4 w-4" /> New Event
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <div className="grid gap-3">
          {EVENTS.map((ev) => {
            const isWalk = ev.type === "walk";
            return (
              <GlassCard key={ev.id} className="p-4 relative overflow-hidden flex items-start gap-4">
                <div className={`absolute top-0 bottom-0 left-0 w-1 ${isWalk ? "bg-amber-500" : "bg-slate-500"}`} />
                <div className={`mt-1 shrink-0 p-2 rounded-xl ${isWalk ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/20"}`}>
                  {isWalk ? <MapPin className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <p className={`text-base font-black truncate ${isWalk ? "text-amber-100" : "text-slate-200"}`}>{ev.title}</p>
                    <span className="text-xs font-bold text-slate-400 shrink-0 bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800/50">
                      {ev.date}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-500 mt-1">{ev.project}</p>
                  {ev.location && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {ev.location}
                    </p>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
