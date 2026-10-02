import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { EMPTY_CEO_WORK, type CeoDashboardRow, type CeoDashboardWork } from "@/lib/ops-console/work-types";

type QueryResult<T> = { data: T[] | null; error: { message: string } | null };

function day(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

async function readRows<T>(query: PromiseLike<QueryResult<T>>): Promise<{ ok: boolean; rows: T[] }> {
  try {
    const { data, error } = await query;
    if (error) return { ok: false, rows: [] };
    return { ok: true, rows: data ?? [] };
  } catch {
    return { ok: false, rows: [] };
  }
}

/**
 * Owner work lists for the CEO Dashboard. Empty results stay empty.
 * A failed read is reported as unavailable, not filled with sample rows.
 */
export async function loadCeoDashboardWork(orgId: string | null): Promise<CeoDashboardWork> {
  if (!orgId) return { ...EMPTY_CEO_WORK, leadsAvailable: false };

  const admin = createAdminClient();
  const [leads, twins, walks, projectShares, jobs, deliverables, twinsSpaces, invoices, contacts] = await Promise.all([
    readRows<{
      id: string;
      created_at: string;
      name: string;
      company: string | null;
      email: string;
      project_location: string | null;
      timeline: string | null;
    }>(
      admin
        .from("site_visit_inquiries")
        .select("id, created_at, name, company, email, project_location, timeline")
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    readRows<{ id: string; label: string | null; token: string; view_count: number; created_at: string }>(
      admin
        .from("digital_twin_share_tokens")
        .select("id, label, token, view_count, created_at")
        .eq("org_id", orgId)
        .eq("is_revoked", false)
        .order("created_at", { ascending: false })
        .limit(30),
    ),
    readRows<{ id: string; title: string; share_token: string; share_view_count: number; status: string }>(
      admin
        .from("site_walk_deliverables")
        .select("id, title, share_token, share_view_count, status")
        .eq("org_id", orgId)
        .eq("share_revoked", false)
        .not("share_token", "is", null)
        .order("updated_at", { ascending: false })
        .limit(30),
    ),
    readRows<{ id: string; label: string | null; recipient_name: string | null; token_prefix: string; view_count: number }>(
      admin
        .from("spatial_project_shares")
        .select("id, label, recipient_name, token_prefix, view_count")
        .eq("org_id", orgId)
        .eq("is_revoked", false)
        .order("created_at", { ascending: false })
        .limit(30),
    ),
    readRows<{ id: string; name: string; status: string | null; client_name: string | null; location: string | null }>(
      admin
        .from("projects")
        .select("id, name, status, client_name, location")
        .eq("org_id", orgId)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false })
        .limit(40),
    ),
    readRows<{ id: string; title: string; status: string; deliverable_type: string; updated_at: string }>(
      admin
        .from("site_walk_deliverables")
        .select("id, title, status, deliverable_type, updated_at")
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false })
        .limit(40),
    ),
    readRows<{ id: string; title: string; status: string; updated_at: string }>(
      admin
        .from("digital_twin_spaces")
        .select("id, title, status, updated_at")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(20),
    ),
    readRows<{ id: string; number: string; client_name: string | null; status: string | null; project_id: string | null }>(
      admin.from("invoices").select("id, number, client_name, status, project_id").order("created_at", { ascending: false }).limit(40),
    ),
    readRows<{ id: string; name: string; company: string | null; email: string | null; phone: string | null }>(
      admin
        .from("org_contacts")
        .select("id, name, company, email, phone")
        .eq("org_id", orgId)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false })
        .limit(40),
    ),
  ]);

  const projectIds = new Set(jobs.rows.map((row) => row.id));
  const invoiceRows = invoices.rows.filter((row) => row.project_id != null && projectIds.has(row.project_id));

  const portals: CeoDashboardRow[] = [
    ...twins.rows.map((row) => ({
      id: `twin-${row.id}`,
      title: row.label?.trim() || "Twin share",
      detail: `Twin · ${row.view_count} views · ${day(row.created_at)}`,
      href: `/share/twin/${row.token}`,
    })),
    ...walks.rows.map((row) => ({
      id: `walk-${row.id}`,
      title: row.title,
      detail: `Walkthrough · ${row.status} · ${row.share_view_count} views`,
      href: `/view/${row.share_token}`,
    })),
    ...projectShares.rows.map((row) => ({
      id: `portal-${row.id}`,
      title: row.label?.trim() || row.recipient_name?.trim() || "Project portal",
      detail: `Portal · ${row.view_count} views · link prefix ${row.token_prefix}`,
      href: null,
    })),
  ];

  const deliverableRows: CeoDashboardRow[] = [
    ...deliverables.rows.map((row) => ({
      id: `del-${row.id}`,
      title: row.title,
      detail: `${row.deliverable_type} · ${row.status} · ${day(row.updated_at)}`,
      href: null,
    })),
    ...twinsSpaces.rows.map((row) => ({
      id: `space-${row.id}`,
      title: row.title,
      detail: `Twin space · ${row.status} · ${day(row.updated_at)}`,
      href: `/twin-studio/${row.id}`,
    })),
  ];

  return {
    leadsAvailable: leads.ok,
    leads: leads.rows.map((row) => ({
      id: row.id,
      title: row.company ? `${row.name} — ${row.company}` : row.name,
      detail: [row.email, row.project_location, row.timeline, day(row.created_at)].filter(Boolean).join(" · "),
    })),
    portals,
    jobs: jobs.rows.map((row) => ({
      id: row.id,
      title: row.name,
      detail: [row.client_name, row.status, row.location].filter(Boolean).join(" · ") || "No status yet",
      href: `/projects/${row.id}`,
    })),
    deliverables: deliverableRows,
    invoices: invoiceRows.map((row) => ({
      id: row.id,
      title: row.number,
      detail: [row.client_name, row.status].filter(Boolean).join(" · ") || "Recorded invoice",
    })),
    contacts: contacts.rows.map((row) => ({
      id: row.id,
      title: row.name,
      detail: [row.company, row.email, row.phone].filter(Boolean).join(" · ") || "No details",
    })),
  };
}
