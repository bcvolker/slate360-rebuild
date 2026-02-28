"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";

type ExternalItem = {
  type: "RFI" | "Submittal" | "Document";
  id: string;
  title: string;
  body: string;
  status: string;
  metadata?: {
    document_type?: string | null;
    document_code?: string | null;
    amount?: number | null;
    version_number?: number | null;
  };
};

type ExternalPayload = {
  ok?: boolean;
  item?: ExternalItem;
  project?: { id: string; name: string };
  error?: string;
};

export default function ExternalRespondPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState<ExternalPayload>({});
  const [responseText, setResponseText] = useState("");
  const [decision, setDecision] = useState("comment");
  const [file, setFile] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/external/respond?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as ExternalPayload;
        if (!cancelled) setPayload(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setToast(null);

    try {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("response_text", responseText);
      formData.set("decision", decision);
      if (file) formData.set("file", file);

      const res = await fetch("/api/external/respond", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to submit response");

      setToast("Response submitted successfully.");
      setResponseText("");
      setFile(null);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.svg" alt="Slate360" className="h-7 w-auto opacity-70" />
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 flex items-center gap-2 shadow-sm">
            <Loader2 size={16} className="animate-spin text-[#FF4D00]" /> Loading response form…
          </div>
        </div>
      </main>
    );
  }

  if (!payload.ok || !payload.item || !payload.project) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 flex items-center justify-center">
        <div className="max-w-md w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#1E3A8A] px-6 py-4">
            <img src="/logo.svg" alt="Slate360" className="h-6 w-auto brightness-0 invert mb-2 opacity-90" />
            <p className="text-sm text-blue-100">Slate360 Secure Portal</p>
          </div>
          <div className="p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-red-500 text-xl font-black">!</span>
            </div>
            <p className="text-sm font-semibold text-red-700 mb-1">{payload.error ?? "Invalid or expired link."}</p>
            <p className="text-xs text-slate-500">This link may have expired or already been used. Please contact the sender for a new link.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6">
      {/* Branded page header */}
      <div className="mx-auto max-w-2xl mb-4 flex items-center gap-3">
        <img src="/logo.svg" alt="Slate360" className="h-6 w-auto" />
        <div className="h-4 w-px bg-slate-300" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Secure Response Portal</p>
      </div>

      <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Branded header bar */}
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#162D69] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-blue-200/80 mb-1.5 bg-white/10 px-2 py-0.5 rounded-full">
                {payload.item.type}
              </span>
              <h1 className="text-xl font-black leading-tight">{payload.item.title}</h1>
              <p className="mt-1.5 text-sm text-blue-100">
                Project: <span className="font-semibold text-white">{payload.project.name}</span>
              </p>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white/80">
              <UploadCloud size={18} />
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-200/70">
            Review the details below and submit your decision. No Slate360 account required.
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {/* Item details */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 mb-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Details</p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{payload.item.body}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                Status: <span className="font-semibold text-slate-700">{payload.item.status}</span>
              </span>
              {payload.item.metadata?.document_type && (
                <span className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                  {payload.item.metadata.document_type}
                  {payload.item.metadata.document_code ? ` · ${payload.item.metadata.document_code}` : ""}
                  {payload.item.metadata.amount ? ` · $${Number(payload.item.metadata.amount).toLocaleString()}` : ""}
                  {payload.item.metadata.version_number ? ` · v${payload.item.metadata.version_number}` : ""}
                </span>
              )}
            </div>
          </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wide">Decision</label>
            <select
              value={decision}
              onChange={(event) => setDecision(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:outline-none transition-all"
            >
              <option value="approve">✓ Approve</option>
              <option value="reject">✗ Reject</option>
              <option value="comment">💬 Comment</option>
              <option value="question">? Question</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wide">Your Response</label>
            <textarea
              value={responseText}
              onChange={(event) => setResponseText(event.target.value)}
              rows={5}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:outline-none transition-all resize-none"
              placeholder="Type your response, feedback, or questions here…"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wide">Attach File (optional)</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3.5 text-sm text-slate-500 hover:bg-slate-100 hover:border-[#FF4D00]/40 transition-all">
              <UploadCloud size={16} className={file ? "text-[#FF4D00]" : ""} />
              <span className={file ? "text-slate-700 font-medium" : ""}>{file ? file.name : "Choose a file to attach"}</span>
              <input
                type="file"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF4D00] px-5 py-3 text-sm font-bold text-white hover:bg-[#E64500] disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {submitting ? "Submitting response…" : "Submit Response"}
            </button>
          </div>
        </form>

        {toast ? (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${toast.toLowerCase().includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
            {toast}
          </div>
        ) : null}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400">Powered by <span className="font-semibold text-slate-500">Slate360</span> · Secure Construction Management Platform</p>
        </div>
        </div>
      </section>
    </main>
  );
}
