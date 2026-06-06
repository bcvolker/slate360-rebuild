/** Mock Digital Twin data for /dev/screens — no backend calls. */

export const MOCK_TWIN_SPACE = {
  id: "dev-twin-space-001",
  title: "Lobby Scan (dev mock)",
  status: "ready" as const,
  projectName: "Riverside Tower",
};

export const MOCK_TWIN_MODELS = [
  {
    id: "dev-model-spz",
    title: "Gaussian splat preview",
    modelFormat: "spz" as const,
    storageKey: "https://sparkjs.dev/assets/splats/butterfly.spz",
    status: "ready" as const,
    isPrimary: true,
  },
  {
    id: "dev-model-glb",
    title: "Structural shell (GLB)",
    modelFormat: "glb" as const,
    storageKey: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
    status: "ready" as const,
    isPrimary: false,
  },
] as const;

export const MOCK_TWIN_JOBS = [
  {
    id: "dev-job-queued",
    status: "queued" as const,
    tier: "standard",
    progress: 0,
  },
  {
    id: "dev-job-processing",
    status: "processing" as const,
    tier: "full",
    progress: 42,
  },
] as const;

export const MOCK_TWIN_SHARE = {
  token: "dev_twin_share_token_mock_01",
  role: "view" as const,
  viewCount: 3,
  maxViews: 50,
  expiresAt: null as string | null,
  isRevoked: false,
};
