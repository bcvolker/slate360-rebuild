/** Hub list types for Digital Twin mobile home. */

export type HubTwin = {
  id: string;
  title: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  updatedAt: string;
};

export type HubTwinProject = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
};
