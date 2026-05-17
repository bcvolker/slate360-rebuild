import { DashboardV3EmptyState } from "./DashboardV3EmptyState";

export function DashboardV3ProcessingQueue({ jobs = [] }: { jobs: any[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Processing Queue</h3>
      <div className="flex-1">
        {jobs.length === 0 ? (
          <DashboardV3EmptyState message="No active processing jobs." />
        ) : (
          <div className="space-y-3">
             {jobs.map((j, i) => <div key={i} className="text-sm text-zinc-400">Job processing...</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
