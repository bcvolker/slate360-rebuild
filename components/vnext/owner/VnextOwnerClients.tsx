import Link from "next/link";
import { formatPlainDate } from "@/lib/vnext/overview-visit";
import type { OwnerClientSummary, OwnerProjectSummary } from "@/lib/vnext/owner/owner-types";
import { VnextOwnerProjectRow } from "./VnextOwnerProjectRow";

const page = "w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]";

export function VnextOwnerClients({
  clients,
  error,
}: {
  clients: OwnerClientSummary[];
  error: string | null;
}) {
  return (
    <div className={page} data-vnext-owner-clients="true">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Clients</h1>
      {error ? (
        <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
          {error}{" "}
          <Link href="/vnext/ops/clients" className="inline-flex min-h-11 items-center">Try again</Link>
        </p>
      ) : clients.length === 0 ? (
        <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]" data-vnext-clients-empty="true">
          No clients are available yet.
        </p>
      ) : (
        <ul className="m-0 mt-4 list-none p-0">
          {clients.map((client) => (
            <li key={client.key} className="border-b border-[var(--vnext-line)] py-3" data-vnext-owner-client={client.key}>
              <Link href={client.href} className="inline-flex min-h-11 items-center text-[length:var(--vnext-body)] font-semibold text-[var(--vnext-ink)] no-underline">
                {client.name}
              </Link>
              <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)]">
                {client.projectCount} {client.projectCount === 1 ? "project" : "projects"}
                {` · ${client.recentProjectName}`}
                {formatPlainDate(client.recentAt) ? ` · ${formatPlainDate(client.recentAt)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VnextOwnerClientDetail({
  name,
  projects,
}: {
  name: string;
  projects: OwnerProjectSummary[];
}) {
  return (
    <div className={page} data-vnext-owner-client-detail={name}>
      <Link href="/vnext/ops/clients" className="inline-flex min-h-11 items-center text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)] no-underline">
        ← Clients
      </Link>
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">{name}</h1>
      {projects.length === 0 ? (
        <p className="mt-4 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">No projects match this client.</p>
      ) : (
        <ul className="m-0 mt-4 list-none p-0">
          {projects.map((project) => (
            <VnextOwnerProjectRow key={project.id} project={project} />
          ))}
        </ul>
      )}
    </div>
  );
}
