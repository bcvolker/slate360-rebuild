"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OwnerProjectSummary } from "@/lib/vnext/owner/owner-types";
import { clientGroupKey } from "@/lib/vnext/owner/clients";
import { filterOwnerProjects } from "@/lib/vnext/owner/project-summary";
import { VnextOwnerProjectRow } from "./VnextOwnerProjectRow";

const control = "h-11 min-w-[44px] border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]";

export function VnextOwnerProjects({
  projects,
  error,
  initialQuery = "",
  initialClient = "",
  initialAttention = false,
  basePath = "/vnext/ops/projects",
}: {
  projects: OwnerProjectSummary[];
  error: string | null;
  initialQuery?: string;
  initialClient?: string;
  initialAttention?: boolean;
  basePath?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [client, setClient] = useState(initialClient);
  const [attentionOnly, setAttentionOnly] = useState(initialAttention);

  useEffect(() => {
    setQ(initialQuery);
    setClient(initialClient);
    setAttentionOnly(initialAttention);
  }, [initialQuery, initialClient, initialAttention]);
  const clients = useMemo(() => {
    const seen = new Map<string, string>();
    for (const project of projects) {
      const key = clientGroupKey(project.clientName);
      if (!key || !project.clientName || seen.has(key)) continue;
      seen.set(key, project.clientName);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [projects]);
  const shown = filterOwnerProjects(projects, { q, client, attentionOnly, archived: false });

  const sync = (next: { q?: string; client?: string; attentionOnly?: boolean }) => {
    const params = new URLSearchParams();
    const query = next.q ?? q;
    const nextClient = next.client ?? client;
    const attention = next.attentionOnly ?? attentionOnly;
    if (query.trim()) params.set("q", query.trim());
    if (nextClient) params.set("client", nextClient);
    if (attention) params.set("attention", "1");
    const suffix = params.toString();
    router.push(suffix ? `${basePath}?${suffix}` : basePath, { scroll: false });
  };

  return (
    <div className="w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-owner-projects="true">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Projects</h1>
      {error ? (
        <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
          {error}{" "}
          <Link href="/vnext/ops/projects" className="inline-flex min-h-11 items-center">Try again</Link>
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              className={`${control} min-w-[12rem] flex-1`}
              aria-label="Search projects"
              placeholder="Project, client, or location"
              value={q}
              data-vnext-project-search="true"
              onChange={(event) => {
                setQ(event.target.value);
                sync({ q: event.target.value });
              }}
            />
            <select
              className={control}
              aria-label="Client"
              value={client}
              data-vnext-client-filter="true"
              onChange={(event) => {
                setClient(event.target.value);
                sync({ client: event.target.value });
              }}
            >
              <option value="">All clients</option>
              {clients.map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={control}
              aria-pressed={attentionOnly}
              data-vnext-attention-filter="true"
              onClick={() => {
                const next = !attentionOnly;
                setAttentionOnly(next);
                sync({ attentionOnly: next });
              }}
            >
              Needs attention
            </button>
          </div>
          {shown.length === 0 ? (
            <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-projects-empty="true">
              {projects.some((project) => !project.archived) ? "No projects match." : "No projects are available yet."}
            </p>
          ) : (
            <ul className="m-0 mt-4 list-none p-0">
              {shown.map((project) => (
                <VnextOwnerProjectRow key={project.id} project={project} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
