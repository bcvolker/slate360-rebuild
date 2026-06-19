"use client";

import { useState } from "react";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { cn } from "@/lib/utils";

type Channel = "email" | "sms" | "both" | "link";

const fieldClass =
  "mt-1 w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-3 py-2 text-sm text-[var(--graphite-text-header)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]";
const labelClass = "block text-xs font-medium text-[var(--graphite-text-body)]";

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
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => {
    setEmail("");
    setPhone("");
    setMessage("");
    setError(null);
    setShareUrl(null);
    setNotice(null);
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
        linkedExisting?: boolean;
        alreadyMember?: boolean;
      };

      if (!res.ok) {
        setError(json.error ?? `Request failed (${res.status})`);
        return;
      }

      onInvited?.();
      if (json.alreadyMember) {
        setNotice("That person is already a Slate360 subscriber and is already on this project.");
      } else if (json.linkedExisting) {
        setNotice("They're already a Slate360 subscriber — added straight to the project, no signup needed. We emailed them a link to open it.");
      } else if (channel === "link" && json.inviteUrl) {
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
        className={cn(t.primaryButton, "!min-h-9 !px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50")}
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={cn(t.sectionCard, "w-full max-w-md shadow-xl")}>
        <h2 className="mb-1 text-lg font-semibold text-[var(--graphite-text-header)]">Invite a collaborator</h2>
        <p className="mb-4 text-xs text-[var(--graphite-muted)]">
          They'll receive a single-use link that expires in 14 days. No subscription required.
        </p>

        {notice ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--graphite-text-body)]">{notice}</p>
            <div className="flex justify-end">
              <button type="button" onClick={close} className={cn(t.primaryButton, "!min-h-9 !px-3 text-sm")}>
                Done
              </button>
            </div>
          </div>
        ) : shareUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--graphite-text-body)]">Share this link with your collaborator:</p>
            <input
              readOnly
              value={shareUrl}
              className={cn(fieldClass, "mt-0 text-xs")}
              onFocus={(e) => e.target.select()}
            />
            <div className="flex justify-end">
              <button type="button" onClick={close} className={cn(t.primaryButton, "!min-h-9 !px-3 text-sm")}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className={labelClass}>
              Channel
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className={fieldClass}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="both">Email + SMS</option>
                <option value="link">Share link / QR</option>
              </select>
            </label>

            {(channel === "email" || channel === "both") && (
              <label className={labelClass}>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contractor@example.com"
                  className={fieldClass}
                />
              </label>
            )}

            {(channel === "sms" || channel === "both") && (
              <label className={labelClass}>
                Phone (E.164, e.g. +13105551234)
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+13105551234"
                  className={fieldClass}
                />
              </label>
            )}

            <label className={labelClass}>
              Personal message (optional)
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className={fieldClass}
              />
            </label>

            {error ? <p className="text-xs text-red-300">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className={cn(t.secondaryButton, "!min-h-9 !px-3 text-sm")}>
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className={cn(t.primaryButton, "!min-h-9 !px-3 text-sm disabled:opacity-60")}
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
