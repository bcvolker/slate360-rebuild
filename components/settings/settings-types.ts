export type SettingsSectionKey =
  | "profile"
  | "security"
  | "notifications"
  | "organization"
  | "billing"
  | "team";

export type BrandSettings = {
  logo_url?: string;
  signature_url?: string;
  primary_color?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  header_html?: string;
  footer_html?: string;
};

export type NotificationFrequency = "off" | "daily" | "weekly";

export type NotificationPrefs = {
  projectUpdates: boolean;
  walkAssignments: boolean;
  deliverableReady: boolean;
  teamActivity: boolean;
  billingAlerts: boolean;
  systemMaintenance: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  projectUpdates: true,
  walkAssignments: true,
  deliverableReady: true,
  teamActivity: true,
  billingAlerts: true,
  systemMaintenance: true,
};

export type TeamMemberRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  lastActive: string | null;
  isSelf: boolean;
};

export type TeamOverview = {
  members: TeamMemberRow[];
  seatCount: number;
  maxSeats: number;
};
