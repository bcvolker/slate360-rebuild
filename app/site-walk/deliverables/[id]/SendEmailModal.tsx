"use client";

import { useState } from "react";
import { Loader2, Send, X, Mail, Image as ImageIcon, FileText } from "lucide-react";

type Mode = "link" | "inline_images" | "pdf_attachment";

export default function SendEmailModal({
  deliverableId,
  deliverableTitle,
  hasPhotos,
  defaultRecipient,
  onClose,
}: {
  deliverableId: string;
  deliverableTitle: string;
  hasPhotos: boolean;
  defaultRecipient?: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>(hasPhotos ? "inline_images" : "link");
  const [email, setEmail] = useState(defaultRecipient ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid recipient email");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/site-walk/deliverables/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverable_id: deliverableId,
          recipient_email: email,
          message: message.trim() || undefined,
          mode,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Send failed");
        return;
      }
      setSent(true);
      setTimeout(onClose, 1400);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-slate-950 border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-cobalt" /> Email this deliverable
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{deliverableTitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ModeBtn active={mode === "link"} onClick={() => setMode("link")}
            icon={<Mail className="h-4 w-4" />} label="Link only" desc="Simple share link" />
          <ModeBtn active={mode === "inline_images"} onClick={() => setMode("inline_images")}
            icon={<ImageIcon className="h-4 w-4" />} label="Photo email"
            desc={hasPhotos ? "Photos render inline" : "No photos in this report"}
            disabled={!hasPhotos} />
          <ModeBtn active={mode === "pdf_attachment"} onClick={() => setMode("pdf_attachment")}
            icon={<FileText className="h-4 w-4" />} label="PDF attachment"
            desc="Single PDF report attached. Best for archive / records." />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">To</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="recipient@example.com"
            autoFocus
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Quick note for the recipient…"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {sent && <p className="text-xs text-emerald-400">Sent — closing…</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5">
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending || sent || !email}
            className="px-4 py-2 text-sm rounded-lg bg-cobalt hover:bg-cobalt-hover disabled:opacity-50 text-primary-foreground flex items-center gap-1.5 font-medium"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({ icon, label, desc, active, disabled, onClick }: {
  icon: React.ReactNode; label: string; desc: string; active: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-3 text-left rounded-lg border text-sm transition disabled:opacity-40 ${
        active
          ? "bg-cobalt/15 border-cobalt/40 text-cobalt"
          : "border-white/10 hover:border-cobalt/30 text-slate-200"
      }`}
    >
      <div className="flex items-center gap-1.5 font-medium">{icon} {label}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{desc}</div>
    </button>
  );
}
