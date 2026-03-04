export type ProjectHubSummary = {
  totals: {
    projects: number;
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;
  };
  budget: {
    totalBudget: number;
    totalSpent: number;
    totalChangeOrders: number;
  };
  work: {
    openRfis: number;
    pendingSubmittals: number;
  };
  recentProjects: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
};

export type ProjectHubProject = {
  id: string;
  name: string;
  status?: string | null;
  description?: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  region?: string | null;
};
