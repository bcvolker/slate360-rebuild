import { AlertCircle } from "lucide-react";

export function DashboardV3AlertStrip({ alerts = [] }: { alerts: any[] }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="w-full bg-[#3B2A18] border-b border-amber-500/20 px-7 py-3 flex items-center gap-3 text-amber-200">
      <AlertCircle className="h-4 w-4" />
      <span className="text-sm font-medium">{alerts[0].message || 'Action required'}</span>
    </div>
  );
}
