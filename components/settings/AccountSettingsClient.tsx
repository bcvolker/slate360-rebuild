"use client";

import { useState } from "react";
import { AlertTriangle, CreditCard, Loader2, ShieldCheck, UserRound, Users, BellRing, Settings2, Plus, ArrowUpRight, CheckCircle2, Palette, UploadCloud, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GlassCard from "@/components/shared/GlassCard";
import { cn } from "@/lib/utils";

interface AccountSettingsClientProps {
  email: string;
  tier: string;
  orgName: string | null;
}

type TabKey = "profile" | "team" | "branding" | "billing" | "security";

const TABS: Array<{ key: TabKey; label: string; icon: typeof UserRound }> = [
  { key: "profile", label: "Profile & Preferences", icon: UserRound },
  { key: "team", label: "Team & Collaborators", icon: Users },
  { key: "branding", label: "Organization Branding", icon: Palette },
  { key: "billing", label: "Billing & Subscription", icon: CreditCard },
  { key: "security", label: "Security", icon: ShieldCheck },
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
      <GlassCard className="p-3 h-fit sticky top-6">
        <div className="mb-3 px-2 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A3AED0]">Account</p>
          <h2 className="mt-1 truncate text-lg font-bold text-white">{orgName ?? "Personal workspace"}</h2>
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
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition",
                  active
                    ? "border border-[#6EA7A0]/25 bg-[#6EA7A0]/10 text-[#6EA7A0]"
                    : "text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </GlassCard>

      <GlassCard className="min-h-[420px] p-5 lg:p-8">
        {activeTab === "profile" && <ProfileAndPreferencesPanel email={email} />}
        {activeTab === "team" && <TeamAndCollaboratorsPanel tier={tier} />}
        {activeTab === "branding" && <OrgBrandingPanel orgName={orgName} />}
        {activeTab === "billing" && <BillingPanel tier={tier} />}
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
      </GlassCard>
    </div>
  );
}

function ProfileAndPreferencesPanel({ email }: { email: string }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    jobTitle: "",
  });
  const [notificationPref, setNotificationPref] = useState<"email" | "push">("email");

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PanelHeader icon={UserRound} label="Identity" title="Profile & Preferences" />
      
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">First Name</label>
            <Input 
              value={formData.firstName} 
              onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="e.g. Jane" 
              className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/50 h-12 rounded-2xl px-4" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Last Name</label>
            <Input 
              value={formData.lastName} 
              onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="e.g. Doe" 
              className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/50 h-12 rounded-2xl px-4" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Phone Number</label>
            <Input 
              value={formData.phone} 
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567" 
              className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/50 h-12 rounded-2xl px-4" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Job Title</label>
            <Input 
              value={formData.jobTitle} 
              onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
              placeholder="e.g. Superintendent" 
              className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/50 h-12 rounded-2xl px-4" 
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Account Email (Read Only)</label>
            <Input 
              value={email} 
              readOnly
              className="border-white/5 bg-slate-950/20 text-slate-400 h-12 rounded-2xl px-4 opacity-70 cursor-not-allowed" 
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Notification Preferences</h3>
            <p className="text-sm text-slate-400 mt-1">Select how you want to receive walk alerts and project updates.</p>
          </div>
          
          <div className="flex gap-2 p-1 border border-white/10 rounded-2xl bg-slate-950/40 max-w-fit">
            <button
              type="button"
              onClick={() => setNotificationPref("email")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all",
                notificationPref === "email" ? "bg-amber-500/10 text-amber-400" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <BellRing className="w-4 h-4" /> Email Alerts
            </button>
            <button
              type="button"
              onClick={() => setNotificationPref("push")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all",
                notificationPref === "push" ? "bg-amber-500/10 text-amber-400" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Settings2 className="w-4 h-4" /> Push Notifications
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button className="rounded-2xl px-6 bg-slate-100 text-slate-900 hover:bg-white font-black">
            Save Profile
          </Button>
        </div>
      </div>
    </section>
  );
}

function TeamAndCollaboratorsPanel({ tier }: { tier: string }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Field Walker");

  const tierLimit = tier === "trial" || tier === "creator" ? 1 : tier === "model" ? 2 : tier === "business" ? 10 : 100;
  const currentSeats = 2; // Mocking current seat count

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PanelHeader icon={Users} label="Access" title="Team & Collaborators" />

      <div className="grid gap-6">
        <div className="bg-slate-950/40 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Collaborator Seats</h3>
            <p className="text-sm text-slate-400 mt-1">
              You are currently using <strong className="text-white">{currentSeats}</strong> of your <strong className="text-white">{tierLimit}</strong> available seats on the {tier} tier.
            </p>
          </div>
          
          {(tier === "model" && currentSeats >= 2) || (tier === "trial" || tier === "creator") ? (
            <Button className="rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shrink-0 whitespace-nowrap">
              <BoltIcon className="w-4 h-4 mr-2" /> Upgrade to Business
            </Button>
          ) : (
             <div className="text-sm font-black text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
               {tierLimit - currentSeats} seats remaining
             </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Invite Team Member</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@domain.com"
              className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 h-12 rounded-2xl px-4 flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="border border-white/10 bg-slate-950 text-slate-200 h-12 rounded-2xl px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none cursor-pointer"
            >
              <option value="Field Walker">Field Walker</option>
              <option value="Executive Viewer">Executive Viewer</option>
              <option value="Admin">Admin</option>
            </select>
            <Button disabled={(tier === "model" && currentSeats >= 2) || (tier === "trial" || tier === "creator")} className="rounded-2xl h-12 px-6 bg-slate-100 text-slate-900 hover:bg-white font-black shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Send Invite
            </Button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-sm font-bold text-slate-200">Current Members</h3>
          <div className="grid gap-3">
            {[
              { email: "john@slate360.ai", role: "Admin", status: "Active" },
              { email: "sarah@slate360.ai", role: "Field Walker", status: "Invite Pending" }
            ].map((member, i) => (
              <div key={i} className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-2xl p-4 transition-colors hover:bg-white/[0.04]">
                <div>
                  <p className="text-sm font-bold text-slate-200">{member.email}</p>
                  <p className="text-xs text-slate-400 mt-1">{member.role}</p>
                </div>
                <div>
                  {member.status === "Active" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
    </svg>
  );
}

function BillingPanel({ tier }: { tier: string }) {
  // Format tier name
  const formattedTier = tier.charAt(0).toUpperCase() + tier.slice(1);
  
  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PanelHeader icon={CreditCard} label="Billing" title="Billing & Subscription" />
      <div className="mt-8 grid gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-amber-950/20 p-6">
          <div className="absolute -right-10 -top-10 opacity-10">
             <CreditCard className="w-40 h-40" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-400">Current Plan</p>
              <h3 className="mt-2 text-3xl font-black text-white">{formattedTier} Tier</h3>
              <p className="mt-2 text-sm text-slate-300 max-w-sm">
                Get the most out of your field teams with unlimited projects, extra collaborator seats, and customized workflows.
              </p>
            </div>
            
            <div className="shrink-0 flex flex-col gap-3">
               <Button className="rounded-2xl h-12 px-6 bg-amber-500 text-slate-950 hover:bg-amber-400 font-black w-full min-w-[200px] shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                 Manage Subscription <ArrowUpRight className="w-4 h-4 ml-2" />
               </Button>
               <Button variant="ghost" className="rounded-2xl h-12 text-slate-300 hover:text-white hover:bg-white/5 font-bold">
                 View Invoices
               </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <h4 className="text-sm font-bold text-slate-200 mb-2 border-b border-white/5 pb-2">Plan Details</h4>
          <DetailRow label="Next Billing Date" value="Dec 15, 2026" />
          <DetailRow label="Payment Method" value="Visa ending in 4242" />
        </div>
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
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PanelHeader icon={ShieldCheck} label="Security" title="Account security" />
      <div className="mt-8 rounded-3xl border border-rose-500/30 bg-rose-500/5 p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <AlertTriangle className="size-5" />
            </div>
            <h3 className="text-base font-black text-rose-200">Danger zone</h3>
          </div>
          {!showDeleteConfirm ? (
            <div className="mt-4">
              <p className="mb-5 text-sm text-slate-300 max-w-lg leading-relaxed">Permanently delete your account and associated data. This action cannot be undone and will immediately revoke all access.</p>
              <Button className="bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white rounded-xl font-bold px-6" onClick={() => setShowDeleteConfirm(true)}>Delete Account</Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4 rounded-2xl border border-rose-500/40 bg-slate-950/80 p-5">
              <p className="text-sm font-black text-slate-200">This will permanently delete:</p>
              <ul className="list-disc space-y-2 pl-5 text-sm font-medium text-slate-400">
                <li>Your user account and login credentials</li>
                <li>All active subscriptions</li>
                <li>All uploaded site visits, pins, and media</li>
                {orgName && <li>Organization &ldquo;{orgName}&rdquo; if you are the sole member</li>}
              </ul>
              <div className="pt-4 mt-4 border-t border-rose-500/20">
                <p className="text-sm text-slate-300 mb-3">Type <code className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs font-black tracking-widest text-rose-300 border border-rose-500/30">DELETE MY ACCOUNT</code> to confirm:</p>
                <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE MY ACCOUNT" className="max-w-xs border-rose-500/30 bg-slate-950 h-11 font-mono text-sm text-slate-100 focus-visible:ring-rose-500/50 rounded-xl" />
                {error && <p className="mt-2 text-sm font-bold text-rose-400">{error}</p>}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button className="bg-rose-600 text-white hover:bg-rose-500 rounded-xl font-black px-6 h-11" onClick={handleDelete} disabled={deleting || confirmation !== "DELETE MY ACCOUNT"}>
                    {deleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Permanently Delete
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-xl h-11 px-6 text-slate-300 hover:text-white hover:bg-white/5 font-bold"
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
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PanelHeader({ icon: Icon, label, title }: { icon: typeof UserRound; label: string; title: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#6EA7A0]/20 bg-[#6EA7A0]/10 text-[#6EA7A0]">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A3AED0]">{label}</p>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-white/[0.04]">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-200">{value}</span>
    </div>
  );
}

function OrgBrandingPanel({ orgName }: { orgName: string | null }) {
  const [companyName, setCompanyName] = useState(orgName ?? "");
  const [supportEmail, setSupportEmail] = useState("");
  const [website, setWebsite] = useState("");

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PanelHeader icon={Palette} label="Branding" title="Organization Branding" />
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Company Logo</h3>
            <div className="border-2 border-dashed border-white/10 rounded-2xl bg-slate-950/40 p-8 flex flex-col items-center justify-center text-center transition-colors hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer">
              <div className="p-3 bg-white/5 rounded-full mb-3">
                <UploadCloud className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-200">Upload Company Logo</p>
              <p className="text-xs text-slate-500 mt-1">Drag and drop or click to browse</p>
              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wider font-black">PNG, JPG up to 5MB</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Company Details</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Company Name</label>
                <Input 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Construction"
                  className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/50 h-11 rounded-xl px-4"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Support Email</label>
                <Input 
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="e.g. support@apex.com"
                  className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/50 h-11 rounded-xl px-4"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Website</label>
                <Input 
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. apexconstruction.com"
                  className="border-white/10 bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus-visible:ring-amber-500/50 h-11 rounded-xl px-4"
                />
              </div>
            </div>
          </div>
          
          <Button className="rounded-2xl px-6 bg-slate-100 text-slate-900 hover:bg-white font-black mt-2">
            Save Branding
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-200 mb-4">Deliverable Preview</h3>
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-xl select-none">
             <div className="bg-white w-full aspect-[1/1.4] rounded-lg p-5 flex flex-col pt-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="w-full flex justify-between items-start mb-6">
                   <div className="flex flex-col gap-1">
                      <div className="w-24 h-8 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                         <ImageIcon className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="h-2 w-16 bg-slate-200 rounded mt-1"></div>
                   </div>
                   <div className="text-right flex flex-col gap-1 items-end">
                      <div className="h-4 w-32 bg-amber-500 rounded"></div>
                      <div className="h-2 w-20 bg-slate-200 rounded mt-1"></div>
                   </div>
                </div>
                
                <div className="space-y-2 mt-4">
                  <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
                  <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                  <div className="h-2 w-full bg-slate-100 rounded mt-6"></div>
                  <div className="h-2 w-full bg-slate-100 rounded"></div>
                  <div className="h-2 w-5/6 bg-slate-100 rounded"></div>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-10 bg-slate-50 flex items-center px-5 justify-between">
                   <div className="h-1.5 w-12 bg-slate-200 rounded"></div>
                   <div className="h-1.5 w-24 bg-slate-200 rounded"></div>
                </div>
             </div>
             <p className="text-center text-xs text-slate-400 mt-4">This logo will appear on all exported PDF reports and client-facing 360 Tours.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
