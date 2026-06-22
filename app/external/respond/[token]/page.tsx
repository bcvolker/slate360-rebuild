"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import {
  ExternalPortalShell,
  PortalGlassCard,
  PortalPrimaryCta,
  TokenStatePage,
} from "@/components/external-portal";

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
  const [submitted, setSubmitted] = useState(false);
  const [payload, setPayload] = useState<ExternalPayload>({});
  const [responseText, setResponseText] = useState("");
  const [decision, setDecision] = useState("comment");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/external/respond?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
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
    setError(null);

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

      setSubmitted(true);
      setResponseText("");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <TokenStatePage state="loading" badge="Secure response" showShell />;
  }

  if (submitted) {
    return (
      <TokenStatePage
        state="success"
        badge="Secure response"
        title="Response submitted"
        description="Your decision was received securely. This link is now closed — contact the project team if you need to send another response."
      />
    );
  }

  if (!payload.ok || !payload.item || !payload.project) {
    const message =
      payload.error ??
      "This link is invalid, expired, or has already been used. Contact the sender for a new link.";
    const expired = message.toLowerCase().includes("expired");
    return (
      <TokenStatePage
        state={expired ? "expired" : "invalid"}
        badge="Secure response"
        title={expired ? "Link expired" : "Link unavailable"}
        description={message}
      />
    );
  }

  const fieldClass =
    "w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[color-mix(in_srgb,var(--graphite-primary)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)]";

  return (
    <ExternalPortalShell
      portalLabel="Secure response"
      title={payload.item.title}
      subtitle={`${payload.item.type} · ${payload.project.name}`}
      orgName={payload.project.name}
    >
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <PortalGlassCard>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Request details
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {payload.item.body}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-300">
              Status: <span className="font-semibold text-white">{payload.item.status}</span>
            </span>
            {payload.item.metadata?.document_type ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-slate-300">
                {payload.item.metadata.document_type}
                {payload.item.metadata.document_code
                  ? ` · ${payload.item.metadata.document_code}`
                  : ""}
                {payload.item.metadata.amount
                  ? ` · $${Number(payload.item.metadata.amount).toLocaleString()}`
                  : ""}
                {payload.item.metadata.version_number
                  ? ` · v${payload.item.metadata.version_number}`
                  : ""}
              </span>
            ) : null}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Review the details and submit your decision. No Slate360 account is required.
          </p>
        </PortalGlassCard>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <PortalGlassCard className="!p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Decision
              </label>
              <select
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
                className={fieldClass}
              >
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
                <option value="comment">Comment</option>
                <option value="question">Question</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Your response
              </label>
              <textarea
                value={responseText}
                onChange={(event) => setResponseText(event.target.value)}
                rows={5}
                required
                className={`${fieldClass} resize-none`}
                placeholder="Type your response, feedback, or questions here…"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                Attach file (optional)
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-3.5 text-sm text-slate-400 transition hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] hover:bg-white/[0.04]">
                <UploadCloud size={16} className={file ? "text-[var(--graphite-primary)]" : ""} />
                <span className={file ? "font-medium text-slate-200" : ""}>
                  {file ? file.name : "Choose a file to attach"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <PortalPrimaryCta
              type="submit"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              ) : null}
              {submitting ? "Submitting response…" : "Submit response"}
            </PortalPrimaryCta>
          </PortalGlassCard>
        </form>
      </main>
    </ExternalPortalShell>
  );
}
