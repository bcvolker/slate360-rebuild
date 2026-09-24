import Link from "next/link";
import type { OwnerAttentionItem, OwnerProjectSummary } from "@/lib/vnext/owner/owner-types";
import { VnextOwnerProjectRow } from "./VnextOwnerProjectRow";

const page = "w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]";
const heading = "m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]";

export function VnextOwnerHome({
  attention,
  projects,
  error,
}: {
  attention: OwnerAttentionItem[];
  projects: OwnerProjectSummary[];
  error: string | null;
}) {
  const recent = projects.filter((project) => !project.archived).slice(0, 6);
  return (
    <div className={page} data-vnext-owner-home="true">
      <h1 className={heading}>Home</h1>
      {error ? (
        <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-owner-error="true">
          {error}{" "}
          <Link href="/vnext/ops" className="inline-flex min-h-11 items-center text-[var(--vnext-ink)]">
            Try again
          </Link>
        </p>
      ) : (
        <>
          <h2 className="mb-2 mt-6 text-[length:var(--vnext-body)] font-semibold text-[var(--vnext-ink)]">Needs attention</h2>
          {attention.length === 0 ? (
            <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-attention-empty="true">
              Nothing needs attention right now.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {attention.map((item) => (
                <li key={item.id} className="border-b border-[var(--vnext-line)] py-3" data-vnext-attention={item.id}>
                  <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{item.title}</p>
                  <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">
                    {item.projectName}
                    {item.clientName ? ` · ${item.clientName}` : ""}
                  </p>
                  <Link href={item.destinationHref} className="inline-flex min-h-11 items-center text-[length:var(--vnext-body)] text-[var(--vnext-ink)] no-underline">
                    Open project
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <h2 className="mb-2 mt-8 text-[length:var(--vnext-body)] font-semibold text-[var(--vnext-ink)]">Recent projects</h2>
          {recent.length === 0 ? (
            <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-projects-empty="true">
              No projects are available yet.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {recent.map((project) => (
                <VnextOwnerProjectRow key={project.id} project={project} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
