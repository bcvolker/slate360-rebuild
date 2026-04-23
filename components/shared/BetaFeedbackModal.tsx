"use client";

import { useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";

type Category = "bug" | "suggestion" | "praise" | "other";
type Severity = "low" | "medium" | "high" | "critical";
type Status = { kind: "idle" } | { kind: "ok" } | { kind: "error"; message: string };

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

  if (!open) return null;

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
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Failed to submit feedback");
      }

      setStatus({ kind: "ok" });
      setForm({ category: "bug", title: "", description: "", severity: "medium", includeData: true });
      window.setTimeout(() => onOpenChange(false), 1200);
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Failed to submit feedback" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold text-foreground mb-4">Submit Beta Feedback</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Field label="Category" className="flex-1">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="w-full p-2 rounded-md bg-glass border border-border text-foreground outline-none focus:border-cobalt text-sm"
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
                  className="w-full p-2 rounded-md bg-glass border border-border text-foreground outline-none focus:border-cobalt text-sm"
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
              className="w-full p-2 rounded-md bg-glass border border-border text-foreground outline-none focus:border-cobalt text-sm"
            />
          </Field>

          <Field label="Description">
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-2 rounded-md bg-glass border border-border text-foreground outline-none focus:border-cobalt resize-none text-sm"
            />
          </Field>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.includeData}
              onChange={(e) => setForm({ ...form, includeData: e.target.checked })}
              className="rounded border-border"
            />
            Include current page URL &amp; session data
          </label>

          {status.kind === "error" && <p className="text-xs text-rose-400" role="alert">{status.message}</p>}
          {status.kind === "ok" && <p className="text-xs text-emerald-400">Thanks — feedback received.</p>}

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
