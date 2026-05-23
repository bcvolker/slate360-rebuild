import { AlertCircle } from "lucide-react";

export function DashboardV3AlertStrip({ alerts = [] }: { alerts: any[] }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="flex w-full items-center gap-3 border-b border-[#00E699]/20 bg-[#0B1F18] px-7 py-3 text-[#F8FAFC]">
      <AlertCircle className="h-4 w-4" />
      <span className="text-sm font-medium">{alerts[0].message || 'Action required'}</span>
    </div>
  );
}
