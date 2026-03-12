export type DirectBuyResponse = {
  error?: string;
  help?: string;
  limit?: number;
  mode?: string;
  openPositions?: number;
  summary?: string;
  trade?: unknown;
  warning?: string;
};

export function resolveDirectBuyFeedback({
  avgPrice,
  amount,
  data,
  ok,
  outcome,
  requestedPaperMode,
}: {
  avgPrice: number;
  amount: number;
  data: DirectBuyResponse;
  ok: boolean;
  outcome: "YES" | "NO";
  requestedPaperMode: boolean;
}) {
  const liveFallback = !requestedPaperMode && (
    data.mode === "paper_fallback"
    || data.mode === "clob_error"
    || data.mode === "clob_invalid_success"
    || data.mode === "clob_network_error"
  );

  if (ok) {
    if (liveFallback) {
      return {
        closeDelayMs: 1800,
        message: `⚠️ Live execution blocked. Executed as Paper Trade. ${data.warning ?? "Backend fell back to paper execution."}`,
        shouldRefresh: true,
      };
    }
    return {
      closeDelayMs: 1200,
      message: data.summary ?? `✅ ${requestedPaperMode ? "Paper trade saved" : "Live order placed"} — ${(amount / avgPrice).toFixed(1)} shares ${outcome}`,
      shouldRefresh: true,
    };
  }

  if (liveFallback && data.trade) {
    return {
      closeDelayMs: 1800,
      message: `⚠️ Live execution blocked. Executed as Paper Trade. ${data.error ?? data.warning ?? "The live order could not be completed."}`,
      shouldRefresh: true,
    };
  }

  return null;
}