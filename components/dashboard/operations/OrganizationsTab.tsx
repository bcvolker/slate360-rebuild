"use client";

import { useEffect, useState } from "react";
import { Loader2, Building2, Users as UsersIcon, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  tier: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  seats_purchased: number | null;
  seats_used: number | null;
  member_count: number;
  created_at: string;
}

export function OrganizationsTab() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/operations/organizations");
    if (!res.ok) {
      setError("Failed to load organizations");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { organizations?: Organization[] };
    setOrgs(data.organizations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = orgs.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.slug ?? "").toLowerCase().includes(q) ||
      (o.tier ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, or tier…"
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cobalt/40"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {filtered.length} of {orgs.length}
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && orgs.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No organizations match this search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((org) => (
            <div
              key={org.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-cobalt/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-cobalt flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-foreground truncate">{org.name}</h3>
                </div>
                {org.tier && (
                  <span className="inline-flex items-center rounded-full bg-cobalt/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cobalt">
                    {org.tier}
                  </span>
                )}
              </div>

              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Members</dt>
                  <dd className="text-foreground inline-flex items-center gap-1">
                    <UsersIcon className="h-3 w-3" />
                    {org.member_count}
                    {org.seats_purchased ? (
                      <span className="text-muted-foreground">/ {org.seats_purchased}</span>
                    ) : null}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="text-foreground">{org.plan_type ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="text-foreground">{org.subscription_status ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="text-foreground">
                    {new Date(org.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
