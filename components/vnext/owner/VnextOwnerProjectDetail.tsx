import Link from "next/link";
import type { ClientCapabilityId } from "@/lib/vnext/scope/capabilities";
import { serviceStateLabel } from "@/lib/vnext/owner/project-summary";
import type { OwnerProjectSummary } from "@/lib/vnext/owner/owner-types";
import { VnextScopeEditor } from "./VnextScopeEditor";

export function VnextOwnerProjectDetail({
  project,
  included,
  canWrite,
  persist,
  error,
}: {
  project: OwnerProjectSummary | null;
  included: readonly ClientCapabilityId[];
  canWrite: boolean;
  persist: "local" | "api";
  error: string | null;
}) {
  return (
    <div className="w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-owner-project-detail={project?.id ?? "missing"}>
      <Link href="/vnext/ops/projects" className="inline-flex min-h-11 items-center text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)] no-underline">
        ← Projects
      </Link>
      {error ? (
        <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{error}</p>
      ) : project ? (
        <>
          <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">{project.name}</h1>
          <p className="mt-1 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">
            {[project.clientName, project.location].filter(Boolean).join(" · ")}
          </p>
          <ul className="m-0 mt-4 list-none p-0" data-vnext-service-lines="true">
            {project.serviceLines.map((line) => (
              <li key={line.id} className="border-b border-[var(--vnext-line)] py-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-service-line={line.id}>
                {line.label} · {serviceStateLabel(line)}
              </li>
            ))}
          </ul>
          <Link href={project.projectHref} className="mt-3 inline-flex h-11 items-center border border-[var(--vnext-line)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)] no-underline">
            Open project
          </Link>
          <VnextScopeEditor projectId={project.id} included={included} canWrite={canWrite} persist={persist} />
        </>
      ) : null}
    </div>
  );
}
