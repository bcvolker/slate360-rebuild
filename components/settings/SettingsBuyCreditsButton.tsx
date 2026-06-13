"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { settingsTokens } from "./settings-tokens";

type Props = {
  disabledReason?: string;
  returnPath?: string;
};

export function SettingsBuyCreditsButton({ disabledReason, returnPath = "/settings" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuyCredits = useCallback(async () => {
    if (disabledReason) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: "starter", return_to: returnPath }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Unable to start credit checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start credit checkout");
      setBusy(false);
    }
  }, [disabledReason, returnPath]);

  return (
    <div>
      <button
        type="button"
        className={settingsTokens.primaryButton}
        onClick={() => void handleBuyCredits()}
        disabled={busy || Boolean(disabledReason)}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Buy credits
      </button>
      {disabledReason ? (
        <p className="mt-2 text-xs font-medium text-[var(--graphite-muted)]">{disabledReason}</p>
      ) : null}
      {error ? <p className={settingsTokens.statusError}>{error}</p> : null}
    </div>
  );
}
