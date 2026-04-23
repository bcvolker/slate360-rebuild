"use client";

/**
 * DoubleDeleteModal — universal protected-deletion UI.
 *
 * Two modes:
 *   - mode="simple"   → standard "Are you sure?" confirm (low-stakes items
 *                       like a single photo, note, pin, annotation).
 *   - mode="protected" → user must type the entity name verbatim AND type
 *                        DELETE to unlock the destructive button (high-
 *                        stakes items: Projects, Site Walk Sessions,
 *                        Deliverables, Organizations).
 *
 * Built on Radix AlertDialog (uses `radix-ui` meta package already in deps).
 * Always rendered with the new modal-panel + form-field utilities so it
 * matches the light palette automatically.
 */

import * as React from "react";
import { AlertDialog as A } from "radix-ui";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DoubleDeleteMode = "simple" | "protected";

export interface DoubleDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Confirmation mode. Default "simple". */
  mode?: DoubleDeleteMode;
  /** Title shown at the top of the dialog. */
  title: string;
  /** Body description (1–2 sentences). */
  description: React.ReactNode;
  /**
   * Required ONLY when mode="protected". The exact name the user must type
   * to unlock the destructive button. Comparison is case-sensitive after
   * trimming whitespace.
   */
  expectedName?: string;
  /** Custom destructive button label. Default: "Permanently delete". */
  confirmLabel?: string;
  /** Custom cancel label. Default: "Cancel". */
  cancelLabel?: string;
  /** Async handler invoked when the user confirms. Errors are swallowed by
   *  the caller — pass a function that toasts on failure. */
  onConfirm: () => Promise<void> | void;
}

export function DoubleDeleteModal({
  open,
  onOpenChange,
  mode = "simple",
  title,
  description,
  expectedName,
  confirmLabel = "Permanently delete",
  cancelLabel = "Cancel",
  onConfirm,
}: DoubleDeleteModalProps) {
  const [typedName, setTypedName] = React.useState("");
  const [typedDelete, setTypedDelete] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Reset on close.
  React.useEffect(() => {
    if (!open) {
      setTypedName("");
      setTypedDelete("");
      setBusy(false);
    }
  }, [open]);

  const isProtected = mode === "protected";
  const nameOk = !isProtected || (expectedName?.trim() ?? "") === typedName.trim();
  const deleteOk = !isProtected || typedDelete.trim() === "DELETE";
  const canConfirm = nameOk && deleteOk && !busy;

  async function handleConfirm() {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <A.Root open={open} onOpenChange={onOpenChange}>
      <A.Portal>
        <A.Overlay className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <A.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[201] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2",
            "modal-panel p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div className="flex-1">
              <A.Title className="text-base font-semibold text-slate-900">{title}</A.Title>
              <A.Description className="mt-1 text-sm text-slate-600">
                {description}
              </A.Description>
            </div>
          </div>

          {isProtected && (
            <div className="mt-5 space-y-3">
              <div>
                <label htmlFor="dd-name" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Type{" "}
                  <span className="font-mono text-slate-900">{expectedName}</span>{" "}
                  to confirm
                </label>
                <input
                  id="dd-name"
                  type="text"
                  autoComplete="off"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="form-field mt-1.5"
                  placeholder={expectedName}
                />
              </div>
              <div>
                <label htmlFor="dd-delete" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Type <span className="font-mono text-slate-900">DELETE</span> to unlock
                </label>
                <input
                  id="dd-delete"
                  type="text"
                  autoComplete="off"
                  value={typedDelete}
                  onChange={(e) => setTypedDelete(e.target.value)}
                  className="form-field mt-1.5"
                  placeholder="DELETE"
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <A.Cancel asChild>
              <button
                type="button"
                disabled={busy}
                className="form-button-ghost rounded-md px-3 py-2 text-sm disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            </A.Cancel>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirmLabel}
            </button>
          </div>
        </A.Content>
      </A.Portal>
    </A.Root>
  );
}
