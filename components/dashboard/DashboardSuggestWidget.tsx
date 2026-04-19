"use client";

import { CheckCircle2, Lightbulb, Loader2, Send } from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/lib/widgets/widget-meta";

type SuggestPriority = "low" | "medium" | "high";

type Props = {
  span: string;
  widgetColor: string;
  widgetSize: WidgetSize;
  onSetSize?: (size: WidgetSize) => void;
  suggestDone: boolean;
  suggestTitle: string;
  suggestDesc: string;
  suggestPriority: SuggestPriority;
  suggestLoading: boolean;
  onTitleChange: (value: string) => void;
  onDescChange: (value: string) => void;
  onPriorityChange: (priority: SuggestPriority) => void;
  onSubmit: () => void;
};

export default function DashboardSuggestWidget({
  span,
  widgetColor,
  widgetSize,
  onSetSize,
  suggestDone,
  suggestTitle,
  suggestDesc,
  suggestPriority,
  suggestLoading,
  onTitleChange,
  onDescChange,
  onPriorityChange,
  onSubmit,
}: Props) {
  return (
    <WidgetCard icon={Lightbulb} title="Suggest a Feature" span={span} delay={350} color={widgetColor} onSetSize={onSetSize} size={widgetSize}>
      {suggestDone ? (
        <div className="text-center py-6">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
          <p className="text-sm font-semibold text-gray-900 mb-1">Thank you!</p>
          <p className="text-xs text-gray-400">Your suggestion has been sent to our team.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Title</label>
            <input
              type="text"
              placeholder="What feature would you like?"
              value={suggestTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
            <textarea
              placeholder="Tell us more about what you need…"
              value={suggestDesc}
              onChange={(event) => onDescChange(event.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Priority</label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((priority) => (
                <button
                  key={priority}
                  onClick={() => onPriorityChange(priority)}
                  className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-all capitalize ${
                    suggestPriority === priority
                      ? "border-[#F59E0B] bg-[#F59E0B]/5 text-[#F59E0B]"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onSubmit}
            disabled={suggestLoading || !suggestTitle.trim() || !suggestDesc.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#F59E0B" }}
          >
            {suggestLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Send size={14} /> Submit suggestion
              </>
            )}
          </button>
        </div>
      )}
    </WidgetCard>
  );
}