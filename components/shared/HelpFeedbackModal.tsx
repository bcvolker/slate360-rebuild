"use client";

import { useState, useEffect } from "react";
import { Loader2, X, UploadCloud, MessageSquare } from "lucide-react";

type Status = "idle" | "saving" | "ok" | "error";
type Tab = "bug" | "feature" | "other";

interface FormState {
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  stepsToReproduce: string;
  useCase: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  severity: "medium",
  category: "UX improvement",
  stepsToReproduce: "",
  useCase: "",
};

export function HelpFeedbackModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [tab, setTab] = useState<Tab>("bug");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pageUrl, setPageUrl] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPageUrl(window.location.pathname + window.location.search);
    setUserAgent(navigator.userAgent);
    setStatus("idle");
    setErrorMessage(null);
    setForm(EMPTY_FORM);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage(null);

    try {
      const payload = {
        type: tab,
        title: form.title,
        description: form.description,
        severity: tab === "bug" ? form.severity : undefined,
        category: tab === "feature" ? form.category : undefined,
        pageUrl,
        userAgent,
        stepsToReproduce: tab === "bug" ? form.stepsToReproduce : undefined,
        useCase: tab === "feature" ? form.useCase : undefined,
        // Attachments are placeholder-only until S3 presigned upload ships.
        attachments: [] as Array<{ url: string; name: string; size: number; contentType: string }>,
      };

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Submission failed");
      }
      setStatus("ok");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Submission failed");
      setStatus("error");
    }
  };

  if (status === "ok") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-xl w-full max-w-md p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-teal/20 text-teal rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Thanks — we received it!</h2>
          <p className="text-muted-foreground mb-6">
            The team reviews every report within 1 business day.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setStatus("idle");
              }}
              className="text-cobalt hover:underline text-sm"
            >
              Submit another
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-cobalt text-white px-6 py-2 rounded-lg font-medium hover:bg-cobalt/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border bg-glass rounded-t-xl">
          <div className="flex flex-wrap gap-2">
            {(["bug", "feature", "other"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-cobalt text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
              >
                {t === "bug" ? "Report a Bug" : t === "feature" ? "Suggest a Feature" : "Other Feedback"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="feedback-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Title *</label>
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-glass border border-border text-foreground outline-none focus:border-cobalt"
                placeholder="Brief summary..."
              />
            </div>

            {tab === "bug" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Severity *</label>
                  <select
                    value={form.severity}
                    onChange={(e) =>
                      setForm({ ...form, severity: e.target.value as FormState["severity"] })
                    }
                    className="w-full p-2.5 rounded-lg bg-glass border border-border text-foreground outline-none focus:border-cobalt"
                  >
                    <option value="low">Low (Minor visual issue)</option>
                    <option value="medium">Medium (Annoying, but usable)</option>
                    <option value="high">High (Core feature broken)</option>
                    <option value="critical">Critical (App crashing/Data loss)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Page URL</label>
                  <input
                    value={pageUrl}
                    onChange={(e) => setPageUrl(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-glass border border-border text-foreground outline-none focus:border-cobalt text-sm"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-foreground">Steps to Reproduce</label>
                  <textarea
                    rows={2}
                    value={form.stepsToReproduce}
                    onChange={(e) => setForm({ ...form, stepsToReproduce: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-glass border border-border text-foreground outline-none focus:border-cobalt resize-none text-sm"
                    placeholder={"1. Go to...\n2. Click..."}
                  />
                </div>
              </div>
            )}

            {tab === "feature" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-glass border border-border text-foreground outline-none focus:border-cobalt"
                  >
                    <option value="New module">New module/tool</option>
                    <option value="UX improvement">UX improvement</option>
                    <option value="Integration">Integration request</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Why do you want this?</label>
                  <input
                    value={form.useCase}
                    onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-glass border border-border text-foreground outline-none focus:border-cobalt text-sm"
                    placeholder="It would save me 2 hours a week..."
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium flex justify-between text-foreground">
                Description *{" "}
                <span className="text-xs text-muted-foreground font-normal">Markdown supported</span>
              </label>
              <textarea
                required
                maxLength={5000}
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-glass border border-border text-foreground outline-none focus:border-cobalt resize-none"
                placeholder="Provide as much detail as possible..."
              />
            </div>

            <div className="p-4 border border-dashed border-border rounded-xl bg-glass flex flex-col items-center justify-center text-center">
              <UploadCloud className="w-6 h-6 text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium">Attach files (Coming Soon)</p>
              <p className="text-xs text-muted-foreground">Up to 5 files, ≤10MB each</p>
            </div>

            {status === "error" && (
              <p className="text-red-500 text-sm">
                {errorMessage ?? "Failed to submit feedback. Please try again."}
              </p>
            )}
          </form>
        </div>

        <div className="p-4 border-t border-border bg-glass flex justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-card border border-border"
          >
            Cancel
          </button>
          <button
            form="feedback-form"
            type="submit"
            disabled={status === "saving"}
            className="bg-cobalt text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-cobalt/90 flex items-center gap-2 disabled:opacity-60"
          >
            {status === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
