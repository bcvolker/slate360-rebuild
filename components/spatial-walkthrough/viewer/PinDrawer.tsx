"use client";

import { X } from "lucide-react";
import "@/components/spatial-walkthrough/viewer/walkthrough-chrome.css";

export type DrawerAttachment = {
  id: string;
  kind: "slatedrop" | "url" | "audio";
  title: string | null;
  url?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  fileName?: string | null;
  audioUrl?: string | null;
};

export type DrawerPin = {
  id: string;
  label: string;
  pinType: string;
  body: string | null;
  attachments: DrawerAttachment[];
};

type Props = {
  pin: DrawerPin | null;
  onClose: () => void;
  allowDownload?: boolean;
};

export function PinDrawer({ pin, onClose, allowDownload = true }: Props) {
  if (!pin) return null;
  const pdf = pin.attachments.find((a) => (a.fileName ?? a.title ?? "").toLowerCase().endsWith(".pdf") && a.previewUrl);
  const image = pin.attachments.find((a) => /\.(png|jpe?g|webp|gif)$/i.test(a.fileName ?? a.title ?? "") && a.previewUrl);
  const audio = pin.attachments.find((a) => a.kind === "audio" && a.audioUrl);

  return (
    <aside className="sw-drawer" role="dialog" aria-label={pin.label}>
      <div className="sw-drawer-head">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sw-muted)]">{pin.pinType}</p>
          <h2 className="truncate text-base font-semibold">{pin.label}</h2>
        </div>
        <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {pin.body ? <p className="mb-4 text-sm leading-relaxed">{pin.body}</p> : null}
        {audio?.audioUrl ? (
          <audio className="sw-voice-player" controls autoPlay src={audio.audioUrl} data-testid="sw-voice-player" />
        ) : null}
        {pdf?.previewUrl ? (
          <iframe title={pin.label} src={pdf.previewUrl} className="mb-4 h-[55vh] w-full border border-white/10 bg-white lg:h-[70vh]" />
        ) : null}
        {image?.previewUrl && !pdf ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.previewUrl} alt="" className="mb-4 w-full border border-white/10" />
        ) : null}
        <ul className="space-y-2">
          {pin.attachments.map((att) => (
            <li key={att.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{att.title || att.fileName || att.url || "Attachment"}</span>
              {att.kind === "url" && att.url ? (
                <a href={att.url} target="_blank" rel="noreferrer" className="text-[var(--sw-accent)]">Open</a>
              ) : null}
              {allowDownload && att.downloadUrl ? (
                <a href={att.downloadUrl} className="text-[var(--sw-accent)]">Download</a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
