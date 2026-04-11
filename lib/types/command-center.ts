/**
 * Types for the Dashboard Command Center.
 * Used by useCommandCenterData hook and all command-center sub-components.
 */

export interface ProjectSummary {
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
}

export interface RecentFile {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  s3_key: string | null;
  created_at: string;
}

export interface CommandCenterData {
  projects: ProjectSummary;
  recentFiles: RecentFile[];
  storageUsedBytes: number;
  isLoading: boolean;
  error: string | null;
}
