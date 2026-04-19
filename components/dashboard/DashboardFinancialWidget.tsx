"use client";

import { TrendingUp } from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/lib/widgets/widget-meta";

type FinancialPoint = {
  month: string;
  credits: number;
};

type Props = {
  span: string;
  widgetColor: string;
  widgetSize: WidgetSize;
  onSetSize?: (size: WidgetSize) => void;
  liveFinancial: FinancialPoint[];
  financialMax: number;
};

export default function DashboardFinancialWidget({
  span,
  widgetColor,
  widgetSize,
  onSetSize,
  liveFinancial,
  financialMax,
}: Props) {
  return (
    <WidgetCard
      icon={TrendingUp}
      title="Financial Snapshot"
      span={span}
      delay={100}
      color={widgetColor}
      onSetSize={onSetSize}
      size={widgetSize}
      action={<span className="text-[11px] text-zinc-500 font-medium">Last 6 months</span>}
    >
      <div className="space-y-4">
        <div className="flex items-end gap-2 h-28">
          {liveFinancial.map((point, index) => (
            <div key={point.month} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[9px] text-zinc-500 font-medium">
                {point.credits > 0 ? `${(point.credits / 1000).toFixed(1)}k` : ""}
              </span>
              <div className="w-full relative flex items-end justify-center" style={{ height: "80px" }}>
                <div
                  className="w-full max-w-[32px] rounded-t-md transition-all duration-700 ease-out hover:opacity-80"
                  style={{
                    height: `${(point.credits / financialMax) * 100}%`,
                    backgroundColor: index === liveFinancial.length - 1 ? "#3B82F6" : "#6366F1",
                    opacity: index === liveFinancial.length - 1 ? 1 : 0.6,
                  }}
                />
              </div>
              <span className="text-[10px] text-zinc-500">{point.month}</span>
            </div>
          ))}
          {liveFinancial.length === 0 && (
            <div className="w-full text-center text-xs text-zinc-500">No financial activity yet</div>
          )}
        </div>

        <div className="flex gap-4 pt-2 border-t border-app">
          <div>
            <p className="text-[10px] text-zinc-500 font-medium">This month</p>
            <p className="text-sm font-bold text-zinc-100">
              {(liveFinancial[liveFinancial.length - 1]?.credits ?? 0).toLocaleString()} credits
            </p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-medium">Avg / month</p>
            <p className="text-sm font-bold text-zinc-100">
              {Math.round(
                liveFinancial.reduce((sum, point) => sum + point.credits, 0) /
                  Math.max(liveFinancial.length, 1)
              ).toLocaleString()} credits
            </p>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
