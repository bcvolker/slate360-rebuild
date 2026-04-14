"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "warning" | "success" | "error";

type FloatingToastProps = {
  message: string;
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms. 0 = no auto-dismiss. Default 6000. */
  duration?: number;
  onDismiss: () => void;
};

const ICONS: Record<ToastVariant, typeof AlertTriangle> = {
  warning: AlertTriangle,
  success: CheckCircle2,
  error: AlertTriangle,
};

const STYLES: Record<ToastVariant, string> = {
  warning:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/90 dark:text-amber-100",
  success:
    "border-green-300 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950/90 dark:text-green-100",
  error:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/90 dark:text-red-100",
};

export function FloatingToast({
  message,
  variant = "warning",
  duration = 6000,
  onDismiss,
}: FloatingToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration <= 0) return;
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  if (!visible) return null;

  const Icon = ICONS[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto fixed left-4 right-4 top-4 z-[100] mx-auto max-w-sm animate-in fade-in slide-in-from-top-2 rounded-lg border px-3 py-2 shadow-lg",
        STYLES[variant],
      )}
    >
      <div className="flex items-start gap-2 text-xs">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">{message}</span>
        <button
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
          className="shrink-0 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
