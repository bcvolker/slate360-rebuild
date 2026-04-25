"use client";

import { useEffect, useState } from "react";
import { Loader2, HardDrive, Cpu, Image as ImageIcon } from "lucide-react";

interface UsageData {
  org_id: string;
  org_name: string;
  storage_bytes: number;
  storage_limit_bytes: number;
  storage_percent: number;
  processing_jobs: number;
  projects_count: number;
}

export function UsageProcessingTab() {
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/operations/usage");
      if (cancelled) return;
      if (!res.ok) {
        setError("Failed to load usage");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { usage?: UsageData[] };
      setUsage(data.usage ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-cobalt" />
      </div>
    );
  }
  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>;

  const formatGB = (bytes: number) => `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  const totalStorage = usage.reduce((acc, u) => acc + u.storage_bytes, 0);
  const totalJobs = usage.reduce((acc, u) => acc + u.processing_jobs, 0);
  const totalProjects = usage.reduce((acc, u) => acc + u.projects_count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryStat
          icon={<HardDrive className="w-4 h-4" />}
          label="Total Platform Storage"
          value={formatGB(totalStorage)}
        />
        <SummaryStat
          icon={<ImageIcon className="w-4 h-4" />}
          label="Total Processing Jobs"
          value={`${totalJobs.toLocaleString()}`}
        />
        <SummaryStat
          icon={<Cpu className="w-4 h-4" />}
          label="Total Active Projects"
          value={`${totalProjects.toLocaleString()}`}
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-foreground text-sm">Top Organizations by Storage</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/20 border-b border-border text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Organization</th>
                <th className="px-6 py-3 font-medium">Storage Used</th>
                <th className="px-6 py-3 font-medium">% of Limit</th>
                <th className="px-6 py-3 font-medium">Processing Jobs</th>
                <th className="px-6 py-3 font-medium">Projects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usage.map((u) => (
                <tr key={u.org_id} className="hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium text-foreground">{u.org_name}</td>
                  <td className="px-6 py-4 text-cobalt font-medium">{formatGB(u.storage_bytes)}</td>
                  <td className="px-6 py-4 text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            u.storage_percent > 90
                              ? "bg-red-500"
                              : u.storage_percent > 70
                              ? "bg-yellow-500"
                              : "bg-cobalt"
                          }`}
                          style={{ width: `${Math.min(100, u.storage_percent)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {u.storage_percent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground">{u.processing_jobs}</td>
                  <td className="px-6 py-4 text-foreground">{u.projects_count}</td>
                </tr>
              ))}
              {usage.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No usage data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border border-border p-6 rounded-xl">
      <div className="flex items-center gap-3 mb-2 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}
