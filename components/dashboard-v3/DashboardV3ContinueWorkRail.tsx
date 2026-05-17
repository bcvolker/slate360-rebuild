import { DashboardV3EmptyState } from "./DashboardV3EmptyState";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardV3ContinueWorkRail({ projects = [], walks = [] }: { projects: any[], walks: any[] }) {
  const items = [...projects.slice(0, 2), ...walks.slice(0, 2)];
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white tracking-tight">Continue Work</h3>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-amber-500 hover:text-amber-400">View All <ChevronRight className="h-3 w-3 ml-1" /></Button>
      </div>
      {items.length === 0 ? (
        <DashboardV3EmptyState message="No recent work" />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {items.map((item, i) => (
            <div key={i} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 aspect-video flex flex-col justify-end p-4 hover:border-white/20 transition-colors cursor-pointer">
               <span className="relative z-10 text-sm font-medium text-white line-clamp-2">{item.name || item.title || "Untitled"}</span>
               <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/20" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
