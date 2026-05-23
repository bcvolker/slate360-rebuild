"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  AUTH_ERROR,
  AUTH_INPUT,
  AUTH_LABEL,
  AUTH_SUBMIT,
} from "@/components/auth/auth-styles";

type DashboardV3FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
};

export function DashboardV3FeedbackModal({ open, onClose }: DashboardV3FeedbackModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "suggestion",
          title,
          description,
          pageUrl: window.location.pathname,
          userAgent: navigator.userAgent,
          appArea: "app-cockpit",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to send feedback.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-white/[0.08] bg-slate-900/90 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#A3AED0] hover:text-white"
          aria-label="Close feedback form"
        >
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold text-[#FFFFFF]">Send Feedback</h2>
        <p className="mt-1 text-sm text-[#A3AED0]">Your note routes directly to the operations inbox.</p>

        {done ? (
          <p className="mt-6 text-sm text-[#00E699]">Feedback received. Thank you.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error ? <div className={AUTH_ERROR}>{error}</div> : null}
            <div>
              <label htmlFor="feedback-title" className={AUTH_LABEL}>Subject</label>
              <input
                id="feedback-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={AUTH_INPUT}
              />
            </div>
            <div>
              <label htmlFor="feedback-body" className={AUTH_LABEL}>Message</label>
              <textarea
                id="feedback-body"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${AUTH_INPUT} min-h-[100px] resize-none py-3`}
              />
            </div>
            <button type="submit" disabled={loading} className={AUTH_SUBMIT}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Submit Feedback"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
