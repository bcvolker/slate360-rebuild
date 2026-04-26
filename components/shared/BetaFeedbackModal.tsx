"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";

type Category = "bug" | "suggestion" | "praise" | "other";
type Severity = "low" | "medium" | "high" | "critical";
type Status = { kind: "idle" } | { kind: "ok" } | { kind: "error"; message: string };

type FeedbackAttachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

interface BetaFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BetaFeedbackModal({ open, onOpenChange }: BetaFeedbackModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [form, setForm] = useState({
    category: "bug" as Category,
    title: "",
    description: "",
    severity: "medium" as Severity,
    includeData: true,
  });
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([]);

  if (!open || typeof document === "undefined") return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ kind: "idle" });

    let replayUrl = "";
    try {
      if (typeof window !== "undefined") {
        const sentry = await import("@sentry/nextjs").catch(() => null);
        if (sentry) {
          const client = sentry.getClient?.();
          const replay = client?.getIntegrationByName?.("Replay") as
            | { getReplayId?: () => string | undefined }
            | undefined;
          const id = replay?.getReplayId?.();
          if (id) {
            replayUrl = id;
          }
        }
      }
    } catch {
      /* sentry replay optional */
    }

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          title: form.title,
          description: form.description,
          severity: form.category === "bug" ? form.severity : undefined,
          pageUrl: form.includeData && typeof window !== "undefined" ? window.location.pathname : "",
          userAgent: form.includeData && typeof navigator !== "undefined" ? navigator.userAgent : "",
          replayUrl: form.includeData ? replayUrl : "",
          attachments,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Failed to submit feedback");
      }

      setStatus({ kind: "ok" });
      setForm({ category: "bug", title: "", description: "", severity: "medium", includeData: true });
      setAttachments([]);
      window.setTimeout(() => onOpenChange(false), 1200);
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Failed to submit feedback" });
    } finally {
      setLoading(false);
    }
  };

  async function handleAttachmentChange(files: FileList | null) {
    if (!files?.length) {
      setAttachments([]);
      return;
    }

    const selected = Array.from(files).slice(0, 3);
    const tooLarge = selected.find((file) => file.size > 2_000_000);
    if (tooLarge) {
      setStatus({ kind: "error", message: "Each attachment must be 2 MB or smaller for Version 1 feedback." });
      return;
    }

    const encoded = await Promise.all(selected.map(readAttachment));
    setAttachments(encoded);
    setStatus({ kind: "idle" });
  }

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div className="modal-panel w-full max-w-lg p-6 relative">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 p-1 text-slate-500 hover:text-slate-900 rounded transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Submit Version 1 Feedback</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Field label="Category" className="flex-1">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="form-field"
              >
                <option value="bug">Report a Bug</option>
                <option value="suggestion">Suggest a Feature</option>
                <option value="praise">Praise</option>
                <option value="other">Other</option>
              </select>
            </Field>
            {form.category === "bug" && (
              <Field label="Severity" className="flex-1">
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}
                  className="form-field"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </Field>
            )}
          </div>

          <Field label="Title">
            <input
              required
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="form-field"
            />
          </Field>

          <Field label="Description">
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="form-field resize-none"
            />
          </Field>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.includeData}
              onChange={(e) => setForm({ ...form, includeData: e.target.checked })}
              className="rounded border-slate-300 text-cobalt focus:ring-cobalt/30"
            />
            Include current page URL &amp; session data
          </label>

          <Field label="Attachments">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.csv"
              onChange={(e) => void handleAttachmentChange(e.target.files)}
              className="form-field text-xs"
            />
            <p className="mt-1 text-[11px] leading-4 text-slate-500">Up to 3 screenshots or files, 2 MB each.</p>
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] text-slate-600">
                {attachments.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="truncate">{file.name} · {Math.round(file.size / 1024)} KB</li>
                ))}
              </ul>
            )}
          </Field>

          {status.kind === "error" && <p className="text-xs text-rose-600" role="alert">{status.message}</p>}
          {status.kind === "ok" && <p className="text-xs text-emerald-600">Thanks — feedback received.</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 mt-1 rounded-md bg-cobalt text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-medium"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Submit Feedback"}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function readAttachment(file: File): Promise<FeedbackAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to read attachment"));
        return;
      }
      resolve({ name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl: reader.result });
    };
    reader.onerror = () => reject(new Error("Failed to read attachment"));
    reader.readAsDataURL(file);
  });
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
