"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Copy, Link2, Loader2 } from "lucide-react";
import { BakeExportControl } from "./BakeExportControl";

type ShareRole = "view" | "annotate" | "download";
type TokenRow = {
  token: string;
  role: ShareRole;
  label: string | null;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  is_revoked: boolean;
  created_at: string;
  last_viewed_at: string | null;
};

const EXPIRY_CHOICES = [
  { id: "", label: "No expiry" },
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
] as const;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * F4 — share-link management + exports, in the Studio instead of only a
 * session-local create button. Links list/revoke works for tokens minted any
 * time, not just this session; branding snapshots are captured at mint by the
 * create route.
 */
export function DeliverPanel({ spaceId, modelId }: { spaceId: string; modelId: string | null }) {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<ShareRole>("view");
  const [expiryDays, setExpiryDays] = useState<string>("");
  const [maxViews, setMaxViews] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/digital-twin/spaces/${spaceId}/share-tokens`);
    const json = (await res.json().catch(() => ({}))) as { tokens?: TokenRow[] };
    if (res.ok) setTokens(json.tokens ?? []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const expiresAt = expiryDays
        ? new Date(Date.now() + Number(expiryDays) * 86_400_000).toISOString()
        : null;
      const res = await fetch("/api/digital-twin/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          space_id: spaceId,
          role,
          expires_at: expiresAt,
          max_views: maxViews ? Number(maxViews) : null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create link");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create link");
    } finally {
      setBusy(false);
    }
  }, [spaceId, role, expiryDays, maxViews, load]);

  const revoke = useCallback(
    async (token: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/digital-twin/share/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not revoke link");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not revoke link");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const copyLink = useCallback(async (token: string) => {
    const url = `${window.location.origin}/share/twin/${token}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(token);
    window.setTimeout(() => setCopied(null), 1800);
  }, []);

  const chipClass = (on: boolean) =>
    `h-8 flex-1 rounded-lg border text-xs font-semibold capitalize transition disabled:opacity-50 ${
      on
        ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_14%,transparent)] text-[var(--twin360-blue)]"
        : "border-white/10 text-zinc-300"
    }`;

  return (
    <div className="h-full min-h-0 overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Create */}
        <section className="space-y-2.5 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_6%,transparent)] p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
            New share link
          </p>
          <div className="flex items-center gap-1.5">
            {(["view", "annotate", "download"] as ShareRole[]).map((r) => (
              <button key={r} type="button" disabled={busy} onClick={() => setRole(r)} className={chipClass(role === r)}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {EXPIRY_CHOICES.map((c) => (
              <button key={c.id} type="button" disabled={busy} onClick={() => setExpiryDays(c.id)} className={chipClass(expiryDays === c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <input
            value={maxViews}
            onChange={(e) => setMaxViews(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Max views (blank = unlimited)"
            inputMode="numeric"
            className="h-9 w-full rounded-lg border border-white/10 bg-[var(--graphite-canvas)]/60 px-3 text-xs text-zinc-100 placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={() => void create()}
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--twin360-blue)] text-sm font-bold text-[var(--graphite-canvas)] disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            Create link
          </button>
          <p className="text-[10px] leading-relaxed text-[var(--graphite-muted)]">
            Links carry the org name and logo captured at creation time and always show the
            published version of this twin.
          </p>
        </section>

        {error ? <p className="text-xs text-red-300">{error}</p> : null}

        {/* Links */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
            Links · {tokens.filter((t) => !t.is_revoked).length} active
          </p>
          {loading ? (
            <Loader2 className="size-4 animate-spin text-[var(--graphite-muted)]" aria-hidden />
          ) : tokens.length === 0 ? (
            <p className="text-xs text-[var(--graphite-muted)]">No links yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {tokens.map((t) => (
                <li
                  key={t.token}
                  className={`flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 ${
                    t.is_revoked ? "opacity-45" : "bg-white/[0.03]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium capitalize text-zinc-100">
                      {t.role} · created {fmtDate(t.created_at)}
                      {t.is_revoked ? " · revoked" : ""}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--graphite-muted)]">
                      {t.view_count} view{t.view_count === 1 ? "" : "s"}
                      {t.max_views != null ? ` of ${t.max_views}` : ""}
                      {t.expires_at ? ` · expires ${fmtDate(t.expires_at)}` : ""}
                      {t.last_viewed_at ? ` · last ${fmtDate(t.last_viewed_at)}` : ""}
                    </p>
                  </div>
                  {t.is_revoked ? null : (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void copyLink(t.token)}
                        className="rounded-md border border-white/10 p-1.5 text-zinc-300 transition hover:border-[var(--accent-border-blue)] hover:text-[var(--twin360-blue)]"
                        aria-label="Copy link"
                      >
                        {copied === t.token ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void revoke(t.token)}
                        disabled={busy}
                        className="rounded-md border border-white/10 p-1.5 text-zinc-300 transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                        aria-label="Revoke link"
                      >
                        <Ban className="size-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Exports */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
            Exports
          </p>
          {modelId ? (
            <div className="flex flex-wrap gap-2">
              {/* E1: bake-aware export — never silently hand out the uncleaned file. */}
              <BakeExportControl modelId={modelId} />
              <p className="w-full text-[10px] leading-relaxed text-[var(--graphite-muted)]">
                Floor-plan SVG/DXF downloads live on the Plan tab. For client-side downloads,
                mint a link with the download role above.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[var(--graphite-muted)]">
              Exports appear once a reconstruction completes.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
