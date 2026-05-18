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
          <div className="space-y-3 h-full flex flex-col justify-start">
             {jobs.map((j, i) => (
               <div key={i} className="flex items-center justify-between rounded-lg p-3 bg-white/[0.02] border border-white/5 text-sm hover:border-white/10 transition-colors">
                 <span className="text-zinc-300 font-medium">Job {j.id?.substring(0,6) || "processing..."}</span>
                 <span className="text-amber-500 text-xs font-bold uppercase">Processing</span>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
