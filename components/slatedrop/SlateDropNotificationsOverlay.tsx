import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type SlateDropNotificationsOverlayProps = {
  toastMsg: { text: string; ok: boolean } | null;
  uploadProgress: Record<string, number>;
};

export default function SlateDropNotificationsOverlay({
  toastMsg,
  uploadProgress,
}: SlateDropNotificationsOverlayProps) {
  return (
    <>
      {toastMsg && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-foreground transition-all ${
            toastMsg.ok ? "bg-emerald-600" : "bg-red-500"
          }`}
        >
          {toastMsg.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toastMsg.text}
        </div>
      )}

      {Object.entries(uploadProgress).length > 0 && (
        <div className="fixed bottom-16 right-6 z-[200] space-y-2">
          {Object.entries(uploadProgress).map(([key, pct]) => (
            <div key={key} className="bg-[#151A23] rounded-xl border border-white/10 shadow-xl p-3 w-64">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 size={13} className="animate-spin text-[var(--graphite-primary)]" />
                <span className="text-xs text-[var(--graphite-text-body)] truncate">{key.split("-").slice(0, -1).join("-")}</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--graphite-primary)] rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}