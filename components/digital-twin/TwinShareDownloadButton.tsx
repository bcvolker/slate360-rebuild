"use client";

import { useCallback, useState } from "react";
import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";

type Props = {
  shareToken: string;
  className?: string;
};

export function TwinShareDownloadButton({ shareToken, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/twin/${shareToken}/download`);
      const data = (await res.json().catch(() => ({}))) as {
        download_url?: string;
        filename?: string;
        error?: string;
      };
      if (!res.ok || !data.download_url) {
        throw new Error(data.error ?? "Could not prepare download");
      }

      const anchor = document.createElement("a");
      anchor.href = data.download_url;
      anchor.download = data.filename ?? "twin-model";
      anchor.rel = "noopener noreferrer";
      anchor.target = "_blank";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }, [shareToken]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={busy}
        className={cn(twinAccent.button, "inline-flex items-center gap-1.5")}
      >
        {busy ? (
          <IconLoader2 className="size-3.5 animate-spin" stroke={1.75} />
        ) : (
          <IconDownload className="size-3.5" stroke={1.75} />
        )}
        Download model
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
