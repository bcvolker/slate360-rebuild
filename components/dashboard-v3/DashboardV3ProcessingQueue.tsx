import { DashboardV3EmptyState } from "./DashboardV3EmptyState";

export function DashboardV3ProcessingQueue({ jobs = [] }: { jobs: any[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-white/5 bg-[#131820] p-6">
      <h3 className="mb-4 text-sm font-semibold text-white tracking-tight">Processing Queue</h3>
      <div className="flex-1 flex flex-col justify-center">
        {jobs.length === 0 ? (
          <DashboardV3EmptyState 
             message="No active processing jobs" 
             helperText="Cloud jobs and exports will appear here."
          />
        ) : (
          <div className="custom-scrollbar max-h-[220px] space-y-3 overflow-y-auto">
             {jobs.map((j, i) => (
               <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3 text-sm transition-colors hover:border-white/10">
                 <span className="font-medium text-zinc-300">Job {j.id?.substring(0,6) || "processing..."}</span>
                 <span className="text-xs font-bold uppercase text-[#00E699]">Processing</span>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
