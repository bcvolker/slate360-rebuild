import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardV3EmptyState({ 
  message = "No data available", 
  helperText,
  actionText, 
  onAction 
}: { 
  message?: string, 
  helperText?: string,
  actionText?: string, 
  onAction?: () => void 
}) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.03] mb-4 border border-white/5">
        <Plus className="h-5 w-5 text-zinc-500" />
      </div>
      <p className="text-sm font-semibold text-zinc-300">{message}</p>
      {helperText && <p className="mt-1.5 text-xs text-zinc-500 max-w-[200px]">{helperText}</p>}
      
      {actionText && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-4 border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white">
          {actionText}
        </Button>
      )}
    </div>
  );
}
