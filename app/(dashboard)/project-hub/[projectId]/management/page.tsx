"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BarChart2, Building2, FileSignature, FileText, FolderOpen, Users } from "lucide-react";
import { useProjectProfile } from "@/lib/hooks/useProjectProfile";
import ViewCustomizer, { useViewPrefs } from "@/components/project-hub/ViewCustomizer";
import type { Tab } from "./_shared";
import ManagementStakeholdersTab from "./ManagementStakeholdersTab";
import ManagementContractsTab from "./ManagementContractsTab";
import ManagementReportsTab from "./ManagementReportsTab";
import ManagementDangerZone from "./ManagementDangerZone";

export default function ProjectManagementPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const { project: profile, company } = useProjectProfile(projectId);
  const projectName = profile?.projectName || "";

  const [activeTab, setActiveTab] = useState<Tab>("stakeholders");
  const [toast, setToast] = useState<string | null>(null);
  const [viewPrefs, setViewPrefs] = useViewPrefs(`viewprefs-management-${projectId}`, []);

  /* Count state — updated by child tab callbacks */
  const [sCounts, setSCounts] = useState({ total: 0, subs: 0 });
  const [cCounts, setCCounts] = useState({ total: 0, executed: 0, draft: 0 });

  const onSStatsChange = useCallback((total: number, subs: number) => setSCounts({ total, subs }), []);
  const onCStatsChange = useCallback((total: number, executed: number, draft: number) => setCCounts({ total, executed, draft }), []);

  const showToast = useCallback((msg: string) => { setToast(msg); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  if (!projectId) return null;

  const TAB_DEF: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: "stakeholders", label: "Stakeholders", icon: Users, count: sCounts.total },
    { id: "contracts", label: "Contracts", icon: FileSignature, count: cCounts.total },
    { id: "reports", label: "Reports", icon: BarChart2 },
  ];

  return (
    <section className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Project Management</p>
          <h2 className="text-xl font-black text-gray-900">Team & Contract Management</h2>
          <p className="mt-1 text-sm text-gray-500">Manage stakeholders, contracts, document summaries, and generate professional reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/project-hub/${projectId}/slatedrop`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <FolderOpen size={14} /> Project Files
          </Link>
          <ViewCustomizer storageKey={`viewprefs-management-${projectId}`} cols={[]} defaultCols={[]} prefs={viewPrefs} onPrefsChange={setViewPrefs} />
          <Link href={`/project-hub/${projectId}/submittals`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition">
            <FileText size={14} /> AIA Documents
          </Link>
        </div>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Stakeholders", value: sCounts.total, color: "text-[#F59E0B]", icon: Users },
          { label: "Active Contracts", value: cCounts.executed, color: "text-emerald-600", icon: FileSignature },
          { label: "Contracts Drafted", value: cCounts.draft, color: "text-amber-600", icon: FileText },
          { label: "Subcontractors", value: sCounts.subs, color: "text-amber-600", icon: Building2 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between"><s.icon size={14} className={s.color} /></div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-0">
        {TAB_DEF.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={["inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors", activeTab === t.id ? "border-[#F59E0B] text-[#F59E0B]" : "border-transparent text-gray-500 hover:text-gray-700"].join(" ")}>
            <t.icon size={14} />
            {t.label}
            {t.count !== undefined && (
              <span className={["rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none", activeTab === t.id ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-gray-100 text-gray-500"].join(" ")}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "stakeholders" && <ManagementStakeholdersTab projectId={projectId} company={company} showToast={showToast} onStatsChange={onSStatsChange} />}
      {activeTab === "contracts" && <ManagementContractsTab projectId={projectId} showToast={showToast} onStatsChange={onCStatsChange} />}
      {activeTab === "reports" && <ManagementReportsTab projectId={projectId} projectName={projectName} showToast={showToast} />}

      {/* ── Danger Zone ── */}
      <ManagementDangerZone projectId={projectId} projectName={projectName} showToast={showToast} />

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}
