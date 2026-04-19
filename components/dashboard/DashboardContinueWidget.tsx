"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock,
  Compass,
  FileText,
  MessageSquare,
  Palette,
} from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/lib/widgets/widget-meta";

type ContinueItem = {
  title: string;
  subtitle: string;
  time: string;
  kind: "design" | "tour" | "rfi" | "report" | "file";
  href: string;
};

type Props = {
  span: string;
  widgetColor: string;
  widgetSize: WidgetSize;
  onSetSize?: (size: WidgetSize) => void;
  items: ContinueItem[];
};

export default function DashboardContinueWidget({ span, widgetColor, widgetSize, onSetSize, items }: Props) {
  return (
    <WidgetCard
      icon={Clock}
      title="Continue Working"
      span={span}
      delay={250}
      color={widgetColor}
      onSetSize={onSetSize}
      size={widgetSize}
      action={
        <Link href="/dashboard" className="text-[11px] font-semibold text-[#F59E0B] hover:underline flex items-center gap-0.5">
          View all <ArrowRight size={11} />
        </Link>
      }
    >
      <div className="space-y-2">
        {items.map((item, index) => {
          const Icon =
            item.kind === "design"
              ? Palette
              : item.kind === "tour"
                ? Compass
                : item.kind === "rfi"
                  ? MessageSquare
                  : item.kind === "report"
                    ? BarChart3
                    : FileText;

          return (
            <Link
              key={index}
              href={item.href}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:text-teal transition-colors">
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-teal transition-colors">{item.title}</p>
                <p className="text-[10px] text-gray-400 truncate">{item.subtitle}</p>
              </div>
              <span className="text-[10px] text-gray-300 shrink-0">{item.time}</span>
            </Link>
          );
        })}
        {items.length === 0 && <div className="text-center py-4 text-xs text-gray-400">No recent activity yet</div>}
      </div>
    </WidgetCard>
  );
}