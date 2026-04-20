/**
 * Shared types for the global Invite & Share modal.
 */

export interface InviteShareProject {
  id: string;
  name: string;
}

export interface InviteShareContact {
  id: string;
  email: string;
  fullName: string | null;
}

export interface InviteShareBetaInfo {
  seatsClaimed: number;
  cap: number;
}

export interface InviteShareData {
  userId: string;
  userName: string;
  beta: InviteShareBetaInfo;
  projects: InviteShareProject[];
  contacts: InviteShareContact[];
}
