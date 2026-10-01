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
import { PortalBrandMark } from "./PortalBrandMark";
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

const NEUTRAL = "text-[var(--portal-ink-muted)] bg-[var(--portal-canvas-alt)] border-[var(--portal-line)]";
const STATE_TONES: Record<PortalTokenState, string> = {
  invalid: NEUTRAL,
  expired: NEUTRAL,
  revoked: "text-red-700 bg-red-50 border-red-200",
  max_views: NEUTRAL,
  denied: "text-red-700 bg-red-50 border-red-200",
  unavailable: NEUTRAL,
  empty: NEUTRAL,
  success: "text-[var(--portal-accent)] bg-[var(--portal-accent-soft)] border-[var(--portal-accent-line)]",
  loading: NEUTRAL,
};

/**
 * Link-state page for every token-gated client surface (expired, revoked, unavailable…).
 * Light, like slate360.ai (theme B): one short message, at most one action.
 */
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
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--portal-line)] bg-[var(--portal-surface)] p-8 text-center shadow-[0_10px_30px_-18px_rgba(26,36,51,0.25)]"
        data-testid="token-state"
        data-state={state}
      >
        <div className={cn("mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border", STATE_TONES[state])}>
          <Icon size={26} className={state === "loading" ? "animate-spin" : undefined} aria-hidden />
        </div>
        {badge ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.07em] text-[var(--portal-ink-muted)]">{badge}</p>
        ) : null}
        <h1 className="font-serif text-2xl font-normal text-[var(--portal-ink)]">{title ?? copy.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--portal-ink-muted)]">{description ?? copy.description}</p>
        {state === "unavailable" ? (
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--portal-ink-muted)]">
            <AlertTriangle size={12} aria-hidden />
            If you expected a file, confirm the sender shared the latest link.
          </p>
        ) : null}
        {actions ? <div className="mt-6 flex flex-col items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );

  if (!showShell) return body;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--portal-canvas)] text-[var(--portal-ink)]" data-portal-theme="light">
      <header className="border-b border-[var(--portal-line)] bg-[var(--portal-surface)]">
        <div className="mx-auto flex w-full max-w-[1120px] items-center px-4 py-3 sm:px-6">
          <PortalBrandMark />
        </div>
      </header>
      {body}
    </div>
  );
}
