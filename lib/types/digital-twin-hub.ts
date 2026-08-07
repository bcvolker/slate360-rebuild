/** Hub list types for Digital Twin mobile home. */

import type { TwinHubStatusChip } from "@/lib/digital-twin/twin-hub-status";

export type HubTwin = {
  id: string;
  title: string;
  status: string;
  statusChip: TwinHubStatusChip;
  projectId: string | null;
  projectName: string | null;
  updatedAt: string;
  /** Count of ready models on the space — the thing the list exists to reach. */
  readyModels: number;
};

export type HubTwinProject = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
};
