"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";

type ExternalItem = {
  type: "RFI" | "Submittal";
  id: string;
  title: string;
  body: string;
  status: string;
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
      <main className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading response form…
        </div>
      </main>
    );
  }

  if (!payload.ok || !payload.item || !payload.project) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {payload.error ?? "Invalid or expired link."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">External Response Portal</p>
        <h1 className="mt-1 text-xl font-black text-slate-900">{payload.item.type} Response</h1>
        <p className="mt-1 text-sm text-slate-600">Project: {payload.project.name}</p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{payload.item.type}</p>
          <h2 className="mt-1 text-base font-bold text-slate-900">{payload.item.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{payload.item.body}</p>
          <p className="mt-3 text-xs text-slate-500">Current status: {payload.item.status}</p>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Your Response</label>
            <textarea
              value={responseText}
              onChange={(event) => setResponseText(event.target.value)}
              rows={6}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="Enter your response details…"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Attach File (optional)</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 hover:bg-slate-100">
              <UploadCloud size={16} />
              <span>{file ? file.name : "Choose a file"}</span>
              <input
                type="file"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {submitting ? "Submitting…" : "Submit Response"}
          </button>
        </form>

        {toast ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {toast}
          </div>
        ) : null}
      </section>
    </main>
  );
}
