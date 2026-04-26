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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="modal-panel w-full max-w-md p-6 relative">
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-3 p-1 text-slate-500 hover:text-slate-900 rounded transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex border-b border-slate-200 mb-5 -mx-6 px-6">
          <button
            type="button"
            onClick={() => setTab("app")}
            className={`pb-3 px-3 text-sm font-medium transition-colors ${
              tab === "app"
                ? "text-cobalt border-b-2 border-cobalt"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Share the App
          </button>
          <button
            type="button"
            onClick={() => setTab("collaborator")}
            className={`pb-3 px-3 text-sm font-medium transition-colors ${
              tab === "collaborator"
                ? "text-cobalt border-b-2 border-cobalt"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Add Collaborator
          </button>
        </div>

        {tab === "app" && (
          <div className="flex flex-col items-center text-center space-y-5">
            <p className="text-sm text-slate-700">
              Let a colleague scan this code to request Slate360 Version 1 access.
            </p>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <QRCodeSVG value={inviteLink} size={180} level="M" />
            </div>
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-md p-1.5">
                <input
                  readOnly
                  value={inviteLink}
                  className="bg-transparent text-xs text-slate-700 flex-1 outline-none px-2"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 text-slate-600 hover:text-cobalt rounded transition-colors"
                  aria-label="Copy invite link"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-cobalt text-primary-foreground hover:bg-cobalt-hover transition-colors text-sm font-medium"
              >
                <Share2 className="h-4 w-4" /> Share — AirDrop, Contacts, Apps
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleEmailShare}
                  className="form-button-ghost flex items-center justify-center gap-2 py-2 rounded-md text-sm"
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button
                  type="button"
                  onClick={handleSmsShare}
                  className="form-button-ghost flex items-center justify-center gap-2 py-2 rounded-md text-sm"
                >
                  <MessageSquare className="h-4 w-4" /> Text
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
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
                className="form-field"
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
                className="form-field"
              />
              <datalist id="invite-contacts-list">
                {contacts.map((c) => <option key={c.id} value={c.email}>{c.fullName ?? c.email}</option>)}
              </datalist>
            </Field>

            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "viewer" | "collaborator" })}
                className="form-field"
              >
                <option value="viewer">Viewer (Read Only)</option>
                <option value="collaborator">Collaborator</option>
              </select>
            </Field>

            {status.kind === "error" && (
              <p className="text-xs text-rose-600" role="alert">{status.message}</p>
            )}
            {status.kind === "ok" && (
              <p className="text-xs text-emerald-600">{status.message}</p>
            )}

            <button
              type="submit"
              disabled={loading || projects.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2 mt-1 rounded-md bg-cobalt text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
