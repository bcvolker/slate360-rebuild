/**
 * Shared dashboard type definitions.
 * Single source of truth — import from here.
 * Both DashboardClient and useDashboardRuntimeData use these.
 */

export type WeatherIcon = "sun" | "cloud-sun" | "cloud" | "rain" | "snow";

export interface DashboardProject {
  id: string;
  name: string;
  location: string;
  thumbnail: string;
  status: "active" | "completed" | "on-hold";
  lastEdited: string;
  type: "3d" | "360" | "geo" | "plan";
  lat?: number | null;
  lng?: number | null;
}

export interface DashboardCalEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  color: string;
  project?: string;
}

export interface DashboardContact {
  name: string;
  role: string;
  /** Project or org name for the context label */
  project: string;
  initials: string;
  color: string;
  email?: string;
}

export interface LiveWeatherState {
  location: string;
  current: {
    temp: number;
    condition: string;
    humidity: number;
    wind: number;
    icon: WeatherIcon;
  };
  forecast: Array<{
    day: string;
    hi: number;
    lo: number;
    icon: WeatherIcon;
    precip: number;
  }>;
  constructionAlerts: Array<{
    message: string;
    severity: "warning" | "caution" | "info";
  }>;
}

export interface DashboardJob {
  id: string;
  name: string;
  type: string;
  progress: number;
  status: "completed" | "processing" | "queued" | "failed";
}

export interface DashboardWidgetsPayload {
  projects: DashboardProject[];
  jobs: DashboardJob[];
  financial: Array<{ month: string; credits: number }>;
  continueWorking: Array<{
    title: string;
    subtitle: string;
    time: string;
    kind: "design" | "tour" | "rfi" | "report" | "file";
    href: string;
  }>;
  seats: Array<{ name: string; role: string; email: string; active: boolean }>;
  contacts: DashboardContact[];
}

export interface DashboardAccountOverview {
  profile: {
    name: string;
    email: string;
    orgName: string;
    role: string;
  };
  billing: {
    plan: string;
    tier: string;
    status: "active" | "trialing" | "past_due" | "canceled";
    renewsOn: string | null;
    purchasedCredits: number;
    totalCreditsBalance: number;
  };
  usage: {
    storageUsedGb: number;
    storageLimitGb: number;
    monthlyCredits: number;
    projectsCount: number;
    modelsCount: number;
    toursCount: number;
    docsCount: number;
  };
  sessions: Array<{ id: string; device: string; ip: string; lastActive: string }>;
  auditLog: Array<{ id: string; action: string; actor: string; createdAt: string }>;
  apiKeys: Array<{ id: string; label: string; lastFour: string; createdAt: string }>;
  isAdmin: boolean;
}

export interface DashboardDeployInfo {
  marker?: string;
  commit?: string | null;
  branch?: string | null;
  url?: string | null;
  region?: string | null;
}

export interface DashboardInboxNotification {
  id: string;
  project_id: string;
  title: string;
  message: string;
  link_path?: string | null;
  created_at: string;
}

export interface DashTab {
  id: string;
  label: string;
  // LucideIcon passed as component reference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  color: string;
  isCEOOnly?: boolean;
}
