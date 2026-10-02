export type CeoDashboardRow = {
  id: string;
  title: string;
  detail: string;
  href?: string | null;
};

export type CeoDashboardWork = {
  /** False when site_visit_inquiries could not be read (table not migrated yet). */
  leadsAvailable: boolean;
  leads: CeoDashboardRow[];
  portals: CeoDashboardRow[];
  jobs: CeoDashboardRow[];
  deliverables: CeoDashboardRow[];
  invoices: CeoDashboardRow[];
  contacts: CeoDashboardRow[];
};

export const EMPTY_CEO_WORK: CeoDashboardWork = {
  leadsAvailable: false,
  leads: [],
  portals: [],
  jobs: [],
  deliverables: [],
  invoices: [],
  contacts: [],
};
