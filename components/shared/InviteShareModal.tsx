"use client";

import { useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Mail, MessageSquare, Share2, CheckCircle2, Loader2, X } from "lucide-react";
import type { InviteShareData } from "@/lib/types/invite";

interface InviteShareModalProps extends InviteShareData {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "app" | "collaborator";
type SubmitStatus = { kind: "idle" } | { kind: "ok"; message: string } | { kind: "error"; message: string };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

export function InviteShareModal({
  open,
  onOpenChange,
  userId,
  beta,
  projects,
  contacts,
}: InviteShareModalProps) {
  const [tab, setTab] = useState<Tab>("app");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });
  const [form, setForm] = useState({ projectId: "", email: "", role: "viewer" as "viewer" | "collaborator" });

  if (!open) return null;

  const inviteLink = `${APP_URL}/signup?ref=${encodeURIComponent(userId)}&launch=1`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus({ kind: "error", message: "Could not copy link." });
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent("Join me on Slate360 Version 1");
    const body = encodeURIComponent(
      `Hi,\n\nI'm using Slate360 Version 1 and thought you'd find it useful. Use my invite link to request launch access:\n\n${inviteLink}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Native share sheet — on iOS opens AirDrop / Messages / Mail / contact picker;
  // on Android opens Nearby Share / SMS / Gmail / contact picker. Falls back to copy.
  const handleNativeShare = async () => {
    const shareData = {
      title: "Slate360 Version 1",
      text: "I'm using Slate360 — request Version 1 launch access:",
      url: inviteLink,
    };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
    } else {
      await handleCopy();
      setStatus({ kind: "ok", message: "Link copied. Paste into any app to share." });
    }
  };

  const handleSmsShare = () => {
    const body = encodeURIComponent(`Join me on Slate360 Version 1: ${inviteLink}`);
    // iOS uses ?body=, Android uses &body=. ?body= works on both modern devices.
    window.location.href = `sms:?&body=${body}`;
  };

  const handleCollaboratorSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.projectId || !form.email) return;
    setLoading(true);
    setStatus({ kind: "idle" });
    try {
      const res = await fetch(`/api/projects/${form.projectId}/collaborators/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          channel: "email",
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Failed to send invite");
      }
      setStatus({ kind: "ok", message: "Invite sent." });
      setForm({ projectId: "", email: "", role: "viewer" });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Failed to send invite" });
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setStatus({ kind: "idle" });
    onOpenChange(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F15]/95 p-6 text-slate-50 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 rounded-full border border-white/15 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="-mx-6 mb-5 flex border-b border-white/10 px-6">
          <button
            type="button"
            onClick={() => setTab("app")}
            className={`px-3 pb-3 text-sm font-black transition-colors ${
              tab === "app"
                ? "border-b-2 border-blue-400 text-blue-100"
                : "text-white/45 hover:text-white/80"
            }`}
          >
            Share App Link
          </button>
          <button
            type="button"
            onClick={() => setTab("collaborator")}
            className={`px-3 pb-3 text-sm font-black transition-colors ${
              tab === "collaborator"
                ? "border-b-2 border-blue-400 text-blue-100"
                : "text-white/45 hover:text-white/80"
            }`}
          >
            Invite Collaborator
          </button>
        </div>

        {tab === "app" && (
          <div className="flex flex-col items-center text-center space-y-5">
            <p className="text-sm font-bold leading-6 text-white/70">
              Let a colleague scan this code to request Slate360 Version 1 access.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white p-3 shadow-lg shadow-blue-500/10">
              <QRCodeSVG value={inviteLink} size={180} level="M" />
            </div>
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-transparent px-2 text-xs font-bold text-white/75 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-xl p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-blue-100"
                  aria-label="Copy invite link"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-black text-white shadow-[0_0_18px_rgba(37,99,235,0.34)] transition-colors hover:bg-blue-500"
              >
                <Share2 className="h-4 w-4" /> Share — AirDrop, Contacts, Apps
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleEmailShare}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-2.5 text-sm font-black text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button
                  type="button"
                  onClick={handleSmsShare}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-2.5 text-sm font-black text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <MessageSquare className="h-4 w-4" /> Text
                </button>
              </div>
            </div>
            <p className="text-xs font-bold text-white/45">
              Version 1 seats: {beta.seatsClaimed} / {beta.cap} claimed
            </p>
          </div>
        )}

        {tab === "collaborator" && (
          <form onSubmit={handleCollaboratorSubmit} className="flex flex-col space-y-4">
            <Field label="Select Project">
              <select
                required
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="" disabled>Choose a project...</option>
                {projects.length === 0 && <option value="" disabled>No projects yet — create one first</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>

            <Field label="Email">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="subcontractor@example.com"
                list="invite-contacts-list"
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
              <datalist id="invite-contacts-list">
                {contacts.map((c) => <option key={c.id} value={c.email}>{c.fullName ?? c.email}</option>)}
              </datalist>
            </Field>

            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "viewer" | "collaborator" })}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="viewer">Viewer (Read Only)</option>
                <option value="collaborator">Collaborator</option>
              </select>
            </Field>

            {status.kind === "error" && (
              <p className="text-xs font-bold text-rose-200" role="alert">{status.message}</p>
            )}
            {status.kind === "ok" && (
              <p className="text-xs font-bold text-emerald-200">{status.message}</p>
            )}

            <button
              type="submit"
              disabled={loading || projects.length === 0}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-black uppercase tracking-wide text-white/55">{label}</label>
      {children}
    </div>
  );
}
