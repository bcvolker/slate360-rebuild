import { ChevronRight, FolderPlus, UploadCloud, Map, AppWindow, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const EMPTY_ACTION_CARDS = [
  { id: "create", title: "Create New Workspace", icon: FolderPlus, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "upload", title: "Upload to SlateDrop", icon: UploadCloud, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "sitewalk", title: "Open Site Walk", icon: Map, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "twin", title: "Start Digital Twin", icon: AppWindow, color: "text-purple-500", bg: "bg-purple-500/10" }
];

export function DashboardV3ContinueWorkRail({ projects = [], walks = [] }: { projects: any[], walks: any[] }) {
  const realItems = [...projects.map(p => ({...p, type: 'Project'})), ...walks.map(w => ({...w, type: 'Walk'}))].slice(0, 4);
  const neededEmpty = Math.max(0, 4 - realItems.length);
  const fillerCards = EMPTY_ACTION_CARDS.slice(0, neededEmpty);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white tracking-tight">Continue Work</h3>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs font-semibold text-amber-500 hover:text-amber-400 group">
          View all <ChevronRight className="h-3.5 w-3.5 ml-0.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {realItems.map((item, i) => (
          <div key={`real-${i}`} className="group relative flex-shrink-0 w-[300px] overflow-hidden rounded-xl border border-white/10 bg-[#131820] aspect-[16/10] flex flex-col justify-end p-5 hover:border-white/20 transition-all cursor-pointer snap-start">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F15]/90 via-[#0B0F15]/40 to-transparent z-0" />
            <div className="relative z-10 flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{item.type}</span>
              <span className="text-base font-semibold text-white line-clamp-1">{item.name || item.title || "Untitled Workspace"}</span>
              <div className="flex items-center gap-1.5 mt-1 opacity-70">
                <Clock className="h-3 w-3 text-zinc-400" />
                <span className="text-xs text-zinc-400">Recently active</span>
              </div>
            </div>
          </div>
        ))}

        {fillerCards.map((card, i) => (
          <div key={`empty-${i}`} className="group relative w-[300px] flex-shrink-0 overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-colors aspect-[16/10] flex flex-col items-center justify-center p-6 text-center cursor-pointer snap-start">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full mb-4 ${card.bg}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">{card.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
