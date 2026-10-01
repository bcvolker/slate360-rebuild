"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ShareListItem } from "@/lib/vnext/share/share-rules";

type ProjectChoice = { id: string; name: string };
type ViewChoice = { id: string; projectId: string; title: string };

const control =
  "inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] w-full max-w-full items-center justify-center border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]";

export function VnextShareBoard({
  projects,
  views,
  links,
  error,
  mode,
}: {
  projects: ProjectChoice[];
  views: ViewChoice[];
  links: ShareListItem[];
  error: string | null;
  mode: "live" | "preview";
}) {
  const router = useRouter();
  const [rows, setRows] = useState(links);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [savedViewId, setSavedViewId] = useState("");
  const [label, setLabel] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const projectViews = useMemo(() => views.filter((view) => view.projectId === projectId), [projectId, views]);

  useEffect(() => {
    setRows(links);
  }, [links]);

  useEffect(() => {
    if (!confirmId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmId]);

  async function copy(row: ShareListItem) {
    try {
      await navigator.clipboard.writeText(row.url);
      setCopied(row.id);
      window.setTimeout(() => setCopied((current) => (current === row.id ? null : current)), 2000);
    } catch {
      setFormError("Copy failed.");
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const target = savedViewId ? "saved_view" : "project";
    if (mode === "preview") {
      const view = projectViews.find((item) => item.id === savedViewId);
      setRows((current) => [
        {
          id: `preview-${current.length + 1}`,
          label: label.trim() || (view ? view.title : "Project link"),
          projectName: projects.find((project) => project.id === projectId)?.name ?? "Project",
          targetLabel: view ? "Saved view" : "Project",
          createdLabel: "Sep 22, 2026",
          expiresLabel: expiresOn || "None",
          status: "Active",
          opens: 0,
          url: "https://slate360.ai/share/project/preview-created-link-000000000000",
        },
        ...current,
      ]);
      return;
    }
    setPending(true);
    const response = await fetch("/api/vnext/ops/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", target, projectId, savedViewId, label, expiresOn }),
    });
    setPending(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setFormError(body?.error ?? "This link could not be created.");
      return;
    }
    setLabel("");
    setExpiresOn("");
    setSavedViewId("");
    router.refresh();
  }

  async function revoke(id: string) {
    setFormError(null);
    if (mode === "preview") {
      setRows((current) => current.map((row) => (row.id === id ? { ...row, status: "Revoked" } : row)));
      setConfirmId(null);
      return;
    }
    setPending(true);
    const response = await fetch("/api/vnext/ops/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", linkId: id }),
    });
    setPending(false);
    setConfirmId(null);
    if (!response.ok) {
      setFormError("This link could not be revoked.");
      return;
    }
    router.refresh();
  }

  return (
    <section data-vnext-share-board="true" className="vnext-portfolio mx-auto w-full max-w-3xl px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Shares</h1>
      <p className="m-0 mt-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">Links you have given out.</p>
      <form data-vnext-share-create="true" className="mt-6 flex flex-col gap-3" onSubmit={(event) => void create(event)}>
        <label className="flex flex-col gap-1 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
          Project
          <select className={control} aria-label="Project" value={projectId} onChange={(event) => { setProjectId(event.target.value); setSavedViewId(""); }}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
          Link target
          <select className={control} aria-label="Link target" value={savedViewId} onChange={(event) => setSavedViewId(event.target.value)}>
            <option value="">Current published project</option>
            {projectViews.map((view) => (
              <option key={view.id} value={view.id}>{view.title}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
          Label
          <input className={control} aria-label="Label" value={label} maxLength={80} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
          Expiration
          <input className={control} aria-label="Expiration" type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
        </label>
        <button type="submit" className={control} disabled={pending || projects.length === 0}>Create link</button>
      </form>
      {error ? <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">Share links could not be loaded.</p> : null}
      {formError ? <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{formError}</p> : null}
      {rows.length === 0 ? <p className="mt-6 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">No links yet.</p> : (
        <ul className="m-0 mt-6 list-none divide-y divide-[var(--vnext-line)] p-0">
          {rows.map((row) => (
            <li key={row.id} data-vnext-share-row={row.id} className="flex flex-col gap-2 py-4">
              <p className="m-0 text-[length:var(--vnext-body)] font-medium text-[var(--vnext-ink)]">{row.label}</p>
              <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">{row.projectName} · {row.targetLabel}</p>
              <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
                Created {row.createdLabel} · Expires {row.expiresLabel} · {row.status} · Opens {row.opens}
              </p>
              <div className="flex flex-wrap gap-2">
                {row.status === "Active" ? (
                  <button type="button" className={control} onClick={() => void copy(row)}>{copied === row.id ? "Copied" : "Copy link"}</button>
                ) : null}
                {row.status === "Active" && confirmId === row.id ? (
                  <>
                    <p className="m-0 self-center text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">Revoke this link?</p>
                    <button type="button" className={control} onClick={() => void revoke(row.id)}>Revoke link</button>
                    <button type="button" className={control} onClick={() => setConfirmId(null)}>Cancel</button>
                  </>
                ) : null}
                {row.status === "Active" && confirmId !== row.id ? (
                  <button type="button" className={control} onClick={() => setConfirmId(row.id)}>Revoke</button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
