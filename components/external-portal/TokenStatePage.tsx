import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  EyeOff,
  FileQuestion,
  Inbox,
  Link2Off,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExternalPortalShell } from "./ExternalPortalShell";
import { PortalGlassCard } from "./PortalGlassCard";
import { TOKEN_STATE_COPY, type PortalTokenState } from "./token-state";

const STATE_ICONS: Record<PortalTokenState, typeof Link2Off> = {
  invalid: Link2Off,
  expired: Clock,
  revoked: Ban,
  max_views: EyeOff,
  denied: Ban,
  unavailable: FileQuestion,
  empty: Inbox,
  success: CheckCircle2,
  loading: Loader2,
};

const STATE_TONES: Record<PortalTokenState, string> = {
  invalid: "text-slate-300 bg-white/5 border-white/10",
  expired: "text-[var(--graphite-muted)] bg-white/[0.05] border-white/10",
  revoked: "text-red-200 bg-red-500/10 border-red-500/30",
  max_views: "text-[var(--graphite-muted)] bg-white/[0.05] border-white/10",
  denied: "text-red-200 bg-red-500/10 border-red-500/30",
  unavailable: "text-slate-300 bg-white/5 border-white/10",
  empty: "text-slate-300 bg-white/5 border-white/10",
  success: "text-emerald-200 bg-emerald-500/10 border-emerald-500/30",
  loading: "text-slate-300 bg-white/5 border-white/10",
};

export function TokenStatePage({
  state,
  title,
  description,
  badge,
  actions,
  showShell = true,
}: {
  state: PortalTokenState;
  title?: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  showShell?: boolean;
}) {
  const copy = TOKEN_STATE_COPY[state];
  const Icon = STATE_ICONS[state];
  const body = (
    <div className="flex flex-1 items-center justify-center p-6">
      <PortalGlassCard className="w-full max-w-md text-center">
        <div
          className={cn(
            "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border",
            STATE_TONES[state],
          )}
        >
          <Icon
            size={26}
            className={state === "loading" ? "animate-spin" : undefined}
            aria-hidden
          />
        </div>
        {badge ? (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {badge}
          </p>
        ) : null}
        <h1 className="text-xl font-black text-white">{title ?? copy.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {description ?? copy.description}
        </p>
        {state === "unavailable" ? (
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
            <AlertTriangle size={12} aria-hidden />
            If you expected a file, confirm the sender shared the latest link.
          </p>
        ) : null}
        {actions ? <div className="mt-6 flex flex-col items-center gap-2">{actions}</div> : null}
      </PortalGlassCard>
    </div>
  );

  if (!showShell) return body;

  return (
    <ExternalPortalShell portalLabel="Secure portal">{body}</ExternalPortalShell>
  );
}
