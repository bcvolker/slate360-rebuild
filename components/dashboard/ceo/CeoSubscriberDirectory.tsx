"use client";

import { useMemo, useState } from "react";
import { Bot, Dumbbell, Search, RefreshCw } from "lucide-react";
import type { StaffMember } from "@/lib/hooks/useCeoStaff";
import type { CeoSubscriberDirectoryEntry } from "@/lib/hooks/useCeoSubscriberDirectory";

type Props = {
  subscribers: CeoSubscriberDirectoryEntry[];
  staff: StaffMember[];
  loading: boolean;
  error: string | null;
  onGrant: (payload: {
    email: string;
    displayName?: string;
    accessScope?: string[];
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onRevoke: (staffId: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdate: (
    staffId: string,
    payload: { displayName?: string; accessScope?: string[]; notes?: string },
  ) => Promise<{ ok: boolean; error?: string }>;
  onReload: () => Promise<void>;
};

type AccessFilter = "all" | "market" | "athlete360" | "none";

const TIER_ORDER = ["trial", "standard", "business", "enterprise"];

function formatTier(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CeoSubscriberDirectory({
  subscribers,
  staff,
  loading,
  error,
  onGrant,
  onRevoke,
  onUpdate,
  onReload,
}: Props) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const activeStaffByEmail = useMemo(() => {
    return new Map(
      staff.filter((member) => !member.revoked_at).map((member) => [member.email.toLowerCase(), member]),
    );
  }, [staff]);

  const tiers = useMemo(() => {
    return [...new Set(subscribers.map((entry) => entry.orgTier))].sort((left, right) => {
      return TIER_ORDER.indexOf(left) - TIER_ORDER.indexOf(right);
    });
  }, [subscribers]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return subscribers.filter((entry) => {
      if (tierFilter !== "all" && entry.orgTier !== tierFilter) return false;
      if (accessFilter === "market" && !entry.hasMarketAccess) return false;
      if (accessFilter === "athlete360" && !entry.hasAthlete360Access) return false;
      if (accessFilter === "none" && (entry.hasMarketAccess || entry.hasAthlete360Access)) return false;
      if (!needle) return true;

      return [entry.displayName, entry.email, entry.orgName, entry.orgRole]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [accessFilter, search, subscribers, tierFilter]);

  const applyMarketAccess = async (entry: CeoSubscriberDirectoryEntry) => {
    setPendingEmail(entry.email);
    setActionError(null);

    const current = activeStaffByEmail.get(entry.email.toLowerCase());
    let result: { ok: boolean; error?: string };

    if (!current) {
      result = await onGrant({
        email: entry.email,
        displayName: entry.displayName,
        accessScope: ["market"],
        notes: `Granted from CEO subscriber directory for ${entry.orgName}`,
      });
    } else if (current.access_scope.includes("market")) {
      result = { ok: true };
    } else {
      result = await onUpdate(current.id, {
        displayName: current.display_name ?? entry.displayName,
        accessScope: [...current.access_scope, "market"],
      });
    }

    if (!result.ok) setActionError(result.error ?? "Failed to grant Market access");
    setPendingEmail(null);
  };

  const removeMarketAccess = async (entry: CeoSubscriberDirectoryEntry) => {
    const current = activeStaffByEmail.get(entry.email.toLowerCase());
    if (!current) return;

    setPendingEmail(entry.email);
    setActionError(null);

    const nextScope = current.access_scope.filter((scope) => scope !== "market");
    const result = nextScope.length > 0
      ? await onUpdate(current.id, { accessScope: nextScope })
      : await onRevoke(current.id);

    if (!result.ok) setActionError(result.error ?? "Failed to remove Market access");
    setPendingEmail(null);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">Subscriber Access Directory</h3>
          <p className="mt-1 max-w-2xl text-xs text-gray-500">
            Search, filter, and select a subscriber, then grant or remove Market Robot access without manually typing their email.
          </p>
        </div>
        <button
          onClick={onReload}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh Directory
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_180px]">
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
          <Search size={14} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by subscriber, email, org, or role"
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </label>

        <select
          value={tierFilter}
          onChange={(event) => setTierFilter(event.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
        >
          <option value="all">All tiers</option>
          {tiers.map((tier) => (
            <option key={tier} value={tier}>{formatTier(tier)}</option>
          ))}
        </select>

        <select
          value={accessFilter}
          onChange={(event) => setAccessFilter(event.target.value as AccessFilter)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
        >
          <option value="all">All access states</option>
          <option value="market">Has Market access</option>
          <option value="athlete360">Has Athlete360 access</option>
          <option value="none">No internal access</option>
        </select>
      </div>

      {actionError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{actionError}</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-xs text-gray-500">
          <span>{filtered.length} subscriber{filtered.length !== 1 ? "s" : ""}</span>
          <span>Owner account remains CEO-only and is not grantable</span>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">No subscribers match the current filters.</div>
          ) : (
            filtered.map((entry) => {
              const current = activeStaffByEmail.get(entry.email.toLowerCase());
              const pending = pendingEmail === entry.email;
              const marketOn = current?.access_scope.includes("market") ?? entry.hasMarketAccess;
              const athleteOn = current?.access_scope.includes("athlete360") ?? entry.hasAthlete360Access;

              return (
                <div key={entry.id} className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">{entry.displayName}</p>
                      {entry.isOwnerAccount && (
                        <span className="rounded-full bg-[#6366F1]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6366F1]">
                          CEO Owner
                        </span>
                      )}
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        {formatTier(entry.orgTier)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-gray-500">{entry.email}</p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {entry.orgName} · {entry.orgRole.replace(/_/g, " ")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                    <span className={`rounded-full px-2 py-1 ${marketOn ? "bg-[#6366F1]/10 text-[#6366F1]" : "bg-gray-100 text-gray-400"}`}>
                      <Bot size={10} className="mr-1 inline" />
                      Market
                    </span>
                    <span className={`rounded-full px-2 py-1 ${athleteOn ? "bg-amber-100 text-orange-700" : "bg-gray-100 text-gray-400"}`}>
                      <Dumbbell size={10} className="mr-1 inline" />
                      A360
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={pending || entry.isOwnerAccount || marketOn}
                      onClick={() => void applyMarketAccess(entry)}
                      className="rounded-lg bg-[#F59E0B] px-3 py-2 text-xs font-bold text-white hover:bg-[#E04400] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pending ? "Saving..." : marketOn ? "Market Enabled" : "Grant Market"}
                    </button>
                    <button
                      disabled={pending || entry.isOwnerAccount || !marketOn}
                      onClick={() => void removeMarketAccess(entry)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove Market
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}