"use client";

import { CheckCircle2, Clock3, Cpu, XCircle } from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/lib/widgets/widget-meta";

type JobStatus = "completed" | "processing" | "queued" | "failed";

type JobItem = {
  id: string;
  name: string;
  type: string;
  progress: number;
  status: JobStatus;
};

type Props = {
  span: string;
  widgetColor: string;
  widgetSize: WidgetSize;
  onSetSize?: (size: WidgetSize) => void;
  jobs: JobItem[];
};

function statusColor(status: JobStatus): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "processing") return "bg-blue-100 text-blue-700";
  if (status === "queued") return "bg-gray-100 text-gray-600";
  return "bg-red-100 text-red-700";
}

function statusIcon(status: JobStatus) {
  if (status === "completed") return <CheckCircle2 size={14} />;
  if (status === "processing") return <Cpu size={14} />;
  if (status === "queued") return <Clock3 size={14} />;
  return <XCircle size={14} />;
}

export default function DashboardProcessingWidget({ span, widgetColor, widgetSize, onSetSize, jobs }: Props) {
  return (
    <WidgetCard
      icon={Cpu}
      title="Processing Jobs"
      span={span}
      delay={50}
      color={widgetColor}
      onSetSize={onSetSize}
      size={widgetSize}
      action={<span className="text-[11px] text-gray-400 font-medium">{jobs.filter((job) => job.status === "processing").length} active</span>}
    >
      <div className="space-y-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors group"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${statusColor(job.status)}`}>
              {statusIcon(job.status)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{job.name}</p>
              <p className="text-[10px] text-gray-400">{job.type}</p>
            </div>
            {job.status === "processing" && (
              <div className="w-16">
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${job.progress}%`, backgroundColor: "#D4AF37" }}
                  />
                </div>
                <p className="text-[9px] text-gray-400 text-right mt-0.5">{job.progress}%</p>
              </div>
            )}
            {job.status === "completed" && <span className="text-[10px] text-emerald-600 font-medium">Done</span>}
            {job.status === "queued" && <span className="text-[10px] text-gray-400 font-medium">Queued</span>}
          </div>
        ))}
        {jobs.length === 0 && <div className="text-center py-4 text-xs text-gray-400">No processing jobs right now</div>}
      </div>
    </WidgetCard>
  );
}
