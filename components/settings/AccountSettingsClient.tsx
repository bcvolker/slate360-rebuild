"use client";

import { useState } from "react";
import { AlertTriangle, CreditCard, Loader2, Mail, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GlassCard from "@/components/shared/GlassCard";
import { cn } from "@/lib/utils";

interface AccountSettingsClientProps {
  email: string;
  tier: string;
  orgName: string | null;
}

type TabKey = "profile" | "security" | "preferences" | "billing";

const TABS: Array<{ key: TabKey; label: string; icon: typeof UserRound }> = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { key: "billing", label: "Billing", icon: CreditCard },
];

export function AccountSettingsClient({
  email,
  tier,
  orgName,
}: AccountSettingsClientProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  async function handleDelete() {
    if (confirmation !== "DELETE MY ACCOUNT") return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (res.ok) {
        window.location.href = "/login?deleted=true";
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to delete account. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.32fr)_1fr]">
      <GlassCard className="p-3">
        <div className="mb-3 px-2 py-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-400">Account</p>
          <h2 className="mt-1 truncate text-lg font-black text-white">{orgName ?? "Personal workspace"}</h2>
        </div>
        <nav className="space-y-1" aria-label="Account sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black transition",
                  active ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:bg-white/[0.06] hover:text-amber-200",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </GlassCard>

      <GlassCard className="min-h-[420px] p-5">
        {activeTab === "profile" && <ProfilePanel email={email} tier={tier} orgName={orgName} />}
        {activeTab === "security" && (
          <SecurityPanel
            orgName={orgName}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            confirmation={confirmation}
            setConfirmation={setConfirmation}
            deleting={deleting}
            error={error}
            clearError={() => setError(null)}
            handleDelete={handleDelete}
          />
        )}
        {activeTab === "preferences" && <PreferencesPanel />}
        {activeTab === "billing" && <BillingPanel tier={tier} />}
      </GlassCard>
    </div>
  );
}

function ProfilePanel({ email, tier, orgName }: AccountSettingsClientProps) {
  return (
    <section>
      <PanelHeader icon={UserRound} label="Profile" title="Account profile" />
      <div className="mt-6 grid gap-3">
        <DetailRow label="Email" value={email} />
        <DetailRow label="Subscription" value={tier} />
        <DetailRow label="Organization" value={orgName ?? "Personal workspace"} />
      </div>
    </section>
  );
}

function PreferencesPanel() {
  return (
    <section>
      <PanelHeader icon={SlidersHorizontal} label="Preferences" title="Workspace preferences" />
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
        Preferences will be connected to notification, display, and module defaults after the team model is finalized.
      </div>
    </section>
  );
}

function BillingPanel({ tier }: { tier: string }) {
  return (
    <section>
      <PanelHeader icon={CreditCard} label="Billing" title="Subscription" />
      <div className="mt-6 grid gap-3">
        <DetailRow label="Current plan" value={tier} />
        <a href="mailto:support@slate360.ai" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-2xl border border-white/10 px-4 text-sm font-black text-slate-200 transition hover:border-amber-400/60 hover:text-amber-200">
          <Mail className="h-4 w-4" /> Contact billing support
        </a>
      </div>
    </section>
  );
}

function SecurityPanel({
  orgName,
  showDeleteConfirm,
  setShowDeleteConfirm,
  confirmation,
  setConfirmation,
  deleting,
  error,
  clearError,
  handleDelete,
}: {
  orgName: string | null;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (value: boolean) => void;
  confirmation: string;
  setConfirmation: (value: string) => void;
  deleting: boolean;
  error: string | null;
  clearError: () => void;
  handleDelete: () => Promise<void>;
}) {
  return (
    <section>
      <PanelHeader icon={ShieldCheck} label="Security" title="Account security" />
      <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-rose-300" />
          <h3 className="text-sm font-black text-rose-200">Danger zone</h3>
        </div>
        {!showDeleteConfirm ? (
          <div className="mt-3">
            <p className="mb-3 text-sm text-slate-300">Permanently delete your account and associated data. This action cannot be undone.</p>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete Account</Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3 rounded-2xl border border-rose-500/30 bg-slate-950/50 p-4">
            <p className="text-sm font-medium text-slate-200">This will permanently delete:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Your user account and login</li>
              <li>All active subscriptions</li>
              <li>All uploaded files and media</li>
              {orgName && <li>Organization &ldquo;{orgName}&rdquo; if you are the sole member</li>}
            </ul>
            <p className="text-sm text-slate-300">Type <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs font-bold text-rose-200">DELETE MY ACCOUNT</code> to confirm:</p>
            <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE MY ACCOUNT" className="max-w-xs border-white/10 bg-slate-950/70 font-mono text-slate-100" />
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting || confirmation !== "DELETE MY ACCOUNT"}>
                {deleting ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                Permanently Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmation("");
                  clearError();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PanelHeader({ icon: Icon, label, title }: { icon: typeof UserRound; label: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-400">{label}</p>
        <h2 className="text-xl font-black text-white">{title}</h2>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-100">{value}</span>
    </div>
  );
}
