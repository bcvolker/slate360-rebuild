import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardV3EmptyState({ message = "No data available", actionText, onAction }: { message?: string, actionText?: string, onAction?: () => void }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] mb-4">
        <Plus className="h-5 w-5 text-zinc-400" />
      </div>
      <p className="mb-2 text-sm font-medium text-zinc-300">{message}</p>
      {actionText && (
        <Button variant="outline" size="sm" onClick={onAction} className="border-white/10 bg-white/5 hover:bg-white/10 text-xs">
          {actionText}
        </Button>
      )}
    </div>
  );
}
