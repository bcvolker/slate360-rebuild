"use client";

import { useState } from "react";

type Channel = "email" | "sms" | "both" | "link";

type Props = {
  projectId: string;
  disabled?: boolean;
  triggerLabel?: string;
  onInvited?: () => void;
};

export function CollaboratorInviteModal({
  projectId,
  disabled = false,
  triggerLabel = "+ Invite collaborator",
  onInvited,
}: Props) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const reset = () => {
    setEmail("");
    setPhone("");
    setMessage("");
    setError(null);
    setShareUrl(null);
    setChannel("email");
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { channel };
      if (channel !== "sms" && channel !== "link") body.email = email.trim();
      if (channel !== "email" && channel !== "link") body.phone = phone.trim();
      if (message.trim()) body.message = message.trim();

      const res = await fetch(`/api/projects/${projectId}/collaborators/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json().catch(() => ({}))) as {
        inviteUrl?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(json.error ?? `Request failed (${res.status})`);
        return;
      }

      onInvited?.();
      if (channel === "link" && json.inviteUrl) {
        setShareUrl(json.inviteUrl);
      } else {
        close();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Invite a collaborator</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          They'll receive a single-use link that expires in 14 days. No subscription required.
        </p>

        {shareUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">Share this link with your collaborator:</p>
            <input
              readOnly
              value={shareUrl}
              className="w-full rounded border border-border bg-muted px-2 py-1 text-xs"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-foreground">
              Channel
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="both">Email + SMS</option>
                <option value="link">Share link / QR</option>
              </select>
            </label>

            {(channel === "email" || channel === "both") && (
              <label className="block text-xs font-medium text-foreground">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contractor@example.com"
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                />
              </label>
            )}

            {(channel === "sms" || channel === "both") && (
              <label className="block text-xs font-medium text-foreground">
                Phone (E.164, e.g. +13105551234)
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+13105551234"
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                />
              </label>
            )}

            <label className="block text-xs font-medium text-foreground">
              Personal message (optional)
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send invite"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
