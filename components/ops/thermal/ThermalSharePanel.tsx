"use client";

import { useEffect, useState } from "react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";
import { ThermalQuestionsPanel } from "@/components/ops/thermal/ThermalQuestionsPanel";

type ShareRole = "view" | "annotate" | "download";
type ProjectOption = { id: string; name: string };

/** Share & export sub-tab: create share links, export data, file into a project. */
export function ThermalSharePanel({
  sessionId,
  initialProjectId,
}: {
  sessionId: string;
  initialProjectId?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharePassword, setSharePassword] = useState("");
  const [shareRole, setShareRole] = useState<ShareRole>("view");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");

  useEffect(() => {
    fetch("/api/ops/thermal/projects")
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((json) => setProjects((json?.data?.projects ?? json?.projects ?? []) as ProjectOption[]))
      .catch(() => {});
  }, []);

  async function createShareLink() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/ops/thermal/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, role: shareRole, password: sharePassword.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create share link");
      setShareUrl(json.share_url);
      setNotice(json.password_protected ? "Password-protected link created." : "Share link created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className={t.card}>
        <p className={t.eyebrow}>Share link</p>
        <div className="mt-3 grid gap-3">
          <label className="text-xs text-[var(--graphite-muted)]">
            Access role
            <select
              value={shareRole}
              onChange={(e) => setShareRole(e.target.value as ShareRole)}
              className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
            >
              <option value="view">View only</option>
              <option value="annotate">View + annotate</option>
              <option value="download">View + PDF + exports</option>
            </select>
          </label>
          <label className="text-xs text-[var(--graphite-muted)]">
            Optional password
            <input
              type="password"
              value={sharePassword}
              onChange={(e) => setSharePassword(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
              placeholder="Leave blank for open link"
            />
          </label>
          <button type="button" className={t.primaryButton} disabled={busy} onClick={createShareLink}>
            Create share link
          </button>
          {shareUrl ? <p className="break-all text-xs text-[var(--graphite-primary)]">{shareUrl}</p> : null}
          {notice ? <p className="text-xs text-[var(--graphite-muted)]">{notice}</p> : null}
          {error ? <p className="text-xs text-[#fca5a5]">{error}</p> : null}
        </div>
      </div>

      <div className={t.card}>
        <p className={t.eyebrow}>Export the data</p>
        <p className="mt-1 text-xs text-[var(--graphite-muted)]">
          Download the measurements and findings for use in other tools.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <a href={`/api/ops/thermal/sessions/${sessionId}/export?format=csv`} className={`${t.secondaryButton} justify-between`}>
            <span>Spreadsheet</span>
            <span className="text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">.csv · Excel / Sheets</span>
          </a>
          <a href={`/api/ops/thermal/sessions/${sessionId}/export?format=json`} className={`${t.secondaryButton} justify-between`}>
            <span>Raw data</span>
            <span className="text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">.json · for developers</span>
          </a>
          <a href={`/api/ops/thermal/sessions/${sessionId}/export?format=geojson`} className={`${t.secondaryButton} justify-between`}>
            <span>Map data</span>
            <span className="text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">.geojson · GIS / mapping</span>
          </a>
        </div>
        <p className={`${t.eyebrow} mt-5`}>Linked project</p>
        <p className="mt-1 text-xs text-[var(--graphite-muted)]">
          Generated reports file into this project&apos;s SlateDrop Reports folder.
        </p>
        <select
          value={projectId}
          onChange={(e) => {
            const next = e.target.value;
            setProjectId(next);
            fetch(`/api/ops/thermal/sessions/${sessionId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ project_id: next || null }),
            }).catch(() => {});
          }}
          className="mt-2 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
        >
          <option value="">— Not linked —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      </div>

      <ThermalQuestionsPanel sessionId={sessionId} />
    </div>
  );
}
