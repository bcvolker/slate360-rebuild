import { create } from "zustand";

export type AnalyticsScope = "projects" | "tours" | "media" | "workspace";

export type AnalyticsMetrics = {
  totalProjects: number;
  activeTours: number;
  mediaAssets: number;
  storageUsedGb: number;
  storageLimitGb: number;
  monthlyViews: number;
};

export type AnalyticsReport = {
  id: string;
  title: string;
  createdAt: string;
  scope: AnalyticsScope;
  status: "ready" | "processing";
};

type LoadingState = {
  summary: boolean;
  reports: boolean;
  insight: boolean;
  export: boolean;
};

type ExportState = {
  format: "pdf" | "csv" | null;
  url: string | null;
};

type AnalyticsStore = {
  scope: AnalyticsScope;
  metrics: AnalyticsMetrics | null;
  reports: AnalyticsReport[];
  insightText: string;
  loading: LoadingState;
  exportState: ExportState;
  error: string | null;
  setScope: (scope: AnalyticsScope) => void;
  fetchSummary: (scope?: AnalyticsScope) => Promise<void>;
  fetchReports: (scope?: AnalyticsScope) => Promise<void>;
  generateInsight: (scope?: AnalyticsScope) => Promise<void>;
  requestExport: (format: "pdf" | "csv", scope?: AnalyticsScope) => Promise<void>;
};

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  scope: "projects",
  metrics: null,
  reports: [],
  insightText: "",
  loading: {
    summary: false,
    reports: false,
    insight: false,
    export: false,
  },
  exportState: {
    format: null,
    url: null,
  },
  error: null,

  setScope: (scope) => set({ scope }),

  fetchSummary: async (scope) => {
    const activeScope = scope ?? get().scope;
    set((state) => ({
      loading: { ...state.loading, summary: true },
      error: null,
    }));
    try {
      const res = await fetch(`/api/analytics/summary?scope=${activeScope}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load summary");
      set({ metrics: data.metrics as AnalyticsMetrics });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load summary" });
    } finally {
      set((state) => ({ loading: { ...state.loading, summary: false } }));
    }
  },

  fetchReports: async (scope) => {
    const activeScope = scope ?? get().scope;
    set((state) => ({
      loading: { ...state.loading, reports: true },
      error: null,
    }));
    try {
      const res = await fetch(`/api/analytics/reports?scope=${activeScope}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load reports");
      set({ reports: (data.reports ?? []) as AnalyticsReport[] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load reports" });
    } finally {
      set((state) => ({ loading: { ...state.loading, reports: false } }));
    }
  },

  generateInsight: async (scope) => {
    const activeScope = scope ?? get().scope;
    set((state) => ({
      loading: { ...state.loading, insight: true },
      error: null,
    }));
    try {
      const res = await fetch("/api/analytics/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: activeScope }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to generate insight");
      set({ insightText: String(data.insight ?? "No insight generated") });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to generate insight" });
    } finally {
      set((state) => ({ loading: { ...state.loading, insight: false } }));
    }
  },

  requestExport: async (format, scope) => {
    const activeScope = scope ?? get().scope;
    set((state) => ({
      loading: { ...state.loading, export: true },
      exportState: { ...state.exportState, format },
      error: null,
    }));
    try {
      const res = await fetch("/api/analytics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: activeScope, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to request export");
      set({
        exportState: {
          format,
          url: String(data.url ?? ""),
        },
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to request export" });
    } finally {
      set((state) => ({ loading: { ...state.loading, export: false } }));
    }
  },
}));
