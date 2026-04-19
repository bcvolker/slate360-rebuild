export type AppKey = 'site_walk' | 'tours' | 'design_studio' | 'content_studio';
export type SkuTier = 'standard' | 'pro' | 'enterprise';
export type SkuKind =
  | { kind: 'app'; app: AppKey; tier: SkuTier }
  | { kind: 'bundle'; bundle: 'project' | 'studio' | 'total'; tier: SkuTier };

export interface SkuDefinition {
  lookupKey: string;
  name: string;
  monthlyUsd: number;
  annualUsd: number;
  storageGB: number;
  monthlyCredits: number;
  collaboratorsIncluded: number;
  canCreateProjects: boolean;
  hasFullProjectManagement: boolean;
  appsIncluded: AppKey[];
}

export const SKUS: Record<string, SkuDefinition> = {
  site_walk_std: {
    lookupKey: 'site_walk_std',
    name: 'Site Walk Standard',
    monthlyUsd: 79,
    annualUsd: 790,
    storageGB: 5,
    monthlyCredits: 300,
    collaboratorsIncluded: 0,
    canCreateProjects: false,
    hasFullProjectManagement: false,
    appsIncluded: ['site_walk'],
  },
  site_walk_pro: {
    lookupKey: 'site_walk_pro',
    name: 'Site Walk Pro',
    monthlyUsd: 129,
    annualUsd: 1290,
    storageGB: 25,
    monthlyCredits: 1000,
    collaboratorsIncluded: 3,
    canCreateProjects: true,
    hasFullProjectManagement: true,
    appsIncluded: ['site_walk'],
  },

  tours_std: {
    lookupKey: 'tours_std',
    name: '360 Tours Standard',
    monthlyUsd: 119,
    annualUsd: 1190,
    storageGB: 25,
    monthlyCredits: 800,
    collaboratorsIncluded: 0,
    canCreateProjects: false,
    hasFullProjectManagement: false,
    appsIncluded: ['tours'],
  },
  tours_pro: {
    lookupKey: 'tours_pro',
    name: '360 Tours Pro',
    monthlyUsd: 199,
    annualUsd: 1990,
    storageGB: 100,
    monthlyCredits: 3000,
    collaboratorsIncluded: 3,
    canCreateProjects: true,
    hasFullProjectManagement: false,
    appsIncluded: ['tours'],
  },

  design_studio_std: {
    lookupKey: 'design_studio_std',
    name: 'Design Studio Standard',
    monthlyUsd: 119,
    annualUsd: 1190,
    storageGB: 25,
    monthlyCredits: 800,
    collaboratorsIncluded: 0,
    canCreateProjects: false,
    hasFullProjectManagement: false,
    appsIncluded: ['design_studio'],
  },
  design_studio_pro: {
    lookupKey: 'design_studio_pro',
    name: 'Design Studio Pro',
    monthlyUsd: 199,
    annualUsd: 1990,
    storageGB: 100,
    monthlyCredits: 3000,
    collaboratorsIncluded: 3,
    canCreateProjects: true,
    hasFullProjectManagement: false,
    appsIncluded: ['design_studio'],
  },

  content_studio_std: {
    lookupKey: 'content_studio_std',
    name: 'Content Studio Standard',
    monthlyUsd: 119,
    annualUsd: 1190,
    storageGB: 25,
    monthlyCredits: 800,
    collaboratorsIncluded: 0,
    canCreateProjects: false,
    hasFullProjectManagement: false,
    appsIncluded: ['content_studio'],
  },
  content_studio_pro: {
    lookupKey: 'content_studio_pro',
    name: 'Content Studio Pro',
    monthlyUsd: 199,
    annualUsd: 1990,
    storageGB: 100,
    monthlyCredits: 3000,
    collaboratorsIncluded: 3,
    canCreateProjects: true,
    hasFullProjectManagement: false,
    appsIncluded: ['content_studio'],
  },

  project_bundle_std: {
    lookupKey: 'project_bundle_std',
    name: 'Project Bundle Standard',
    monthlyUsd: 159,
    annualUsd: 1590,
    storageGB: 30,
    monthlyCredits: 1200,
    collaboratorsIncluded: 0,
    canCreateProjects: true,
    hasFullProjectManagement: false,
    appsIncluded: ['site_walk', 'tours'],
  },
  project_bundle_pro: {
    lookupKey: 'project_bundle_pro',
    name: 'Project Bundle Pro',
    monthlyUsd: 269,
    annualUsd: 2690,
    storageGB: 125,
    monthlyCredits: 4500,
    collaboratorsIncluded: 5,
    canCreateProjects: true,
    hasFullProjectManagement: true,
    appsIncluded: ['site_walk', 'tours'],
  },

  studio_bundle_std: {
    lookupKey: 'studio_bundle_std',
    name: 'Studio Bundle Standard',
    monthlyUsd: 199,
    annualUsd: 1990,
    storageGB: 65,
    monthlyCredits: 1500,
    collaboratorsIncluded: 0,
    canCreateProjects: false,
    hasFullProjectManagement: false,
    appsIncluded: ['design_studio', 'content_studio'],
  },
  studio_bundle_pro: {
    lookupKey: 'studio_bundle_pro',
    name: 'Studio Bundle Pro',
    monthlyUsd: 339,
    annualUsd: 3390,
    storageGB: 260,
    monthlyCredits: 6000,
    collaboratorsIncluded: 5,
    canCreateProjects: true,
    hasFullProjectManagement: false,
    appsIncluded: ['design_studio', 'content_studio'],
  },

  total_std: {
    lookupKey: 'total_std',
    name: 'Total Platform Standard',
    monthlyUsd: 309,
    annualUsd: 3090,
    storageGB: 95,
    monthlyCredits: 2500,
    collaboratorsIncluded: 0,
    canCreateProjects: true,
    hasFullProjectManagement: false,
    appsIncluded: ['site_walk', 'tours', 'design_studio', 'content_studio'],
  },
  total_pro: {
    lookupKey: 'total_pro',
    name: 'Total Platform Pro',
    monthlyUsd: 519,
    annualUsd: 5190,
    storageGB: 385,
    monthlyCredits: 10000,
    collaboratorsIncluded: 5,
    canCreateProjects: true,
    hasFullProjectManagement: true,
    appsIncluded: ['site_walk', 'tours', 'design_studio', 'content_studio'],
  },
};

export const CREDIT_RATIOS = {
  storage_gb_month: 100,
  small_ai_op: 1,
  medium_render: 5,
  large_render: 30,
  video_render_minute: 50,
  video_360_minute: 200,
} as const;

export const CREDIT_PACKS = {
  starter: { credits: 1000, priceUsd: 10, lookupKey: 'credits_starter' },
  pro:     { credits: 5000, priceUsd: 45, lookupKey: 'credits_pro' },
  power:   { credits: 25000, priceUsd: 200, lookupKey: 'credits_power' },
} as const;

export const COLLABORATOR_ADDONS = {
  five:        { count: 5,  monthlyUsd: 25, lookupKey: 'collab_5_monthly' },
  ten:         { count: 10, monthlyUsd: 45, lookupKey: 'collab_10_monthly' },
  twentyfive:  { count: 25, monthlyUsd: 99, lookupKey: 'collab_25_monthly' },
} as const;

export const BETA_LIMITS = {
  storageGB: 10,
  monthlyCredits: 500,
  monthlyRenders: 20,
  collaboratorsPerProject: 3,
} as const;
