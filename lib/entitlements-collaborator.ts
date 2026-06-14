/**
 * Collect-only collaborator entitlements.
 *
 * A "collaborator" is an outside contributor a subscriber invited to a project
 * (project_members.role='collaborator') who has NO subscription/org of their own
 * — see `lib/server/collaborator-mode.ts` `isCollaboratorOnly()`.
 *
 * Subscriber-side limits (how many collaborators a plan may invite) live in
 * `lib/entitlements.ts` (`maxCollaborators`) and `lib/server/collaborators.ts`.
 * THIS module is the other half: what a collaborator is allowed to DO once
 * inside. It is intentionally a deny-by-default "collect-only" profile —
 * capture and complete assigned walks, nothing else.
 */

/** Capabilities a collect-only collaborator has inside a shared project. */
export interface CollaboratorEntitlements {
  readonly isCollaborator: true;
  /** Capture photos / videos / before-after on assigned site walks. */
  canCapture: boolean;
  /** Acknowledge, progress, and complete walks assigned to them. */
  canCompleteAssignedWalks: boolean;
  /** Capture paired before/after documentation. */
  canCaptureBeforeAfter: boolean;
  // --- Everything below is denied for collect-only collaborators. ---
  /** Generate or download finished deliverables (reports, twins, exports). */
  canAccessDeliverables: false;
  /** Create new projects of their own. */
  canCreateProjects: false;
  /** See or open projects they were not invited to. */
  canAccessOtherProjects: false;
  /** Invite further collaborators or manage the team. */
  canManageTeam: false;
  /** Use standalone studios (Twin, Design, Content, Tours, Thermal). */
  canAccessStudios: false;
}

/**
 * The single collect-only collaborator profile. Constant today (every
 * collaborator gets the same capabilities); kept as a function so per-invite
 * overrides (e.g. an owner granting before/after only) can be layered later
 * without touching call sites.
 */
export function getCollaboratorEntitlements(
  overrides?: Partial<Pick<CollaboratorEntitlements, "canCapture" | "canCompleteAssignedWalks" | "canCaptureBeforeAfter">>,
): CollaboratorEntitlements {
  return {
    isCollaborator: true,
    canCapture: true,
    canCompleteAssignedWalks: true,
    canCaptureBeforeAfter: true,
    canAccessDeliverables: false,
    canCreateProjects: false,
    canAccessOtherProjects: false,
    canManageTeam: false,
    canAccessStudios: false,
    ...overrides,
  };
}

/**
 * Guard for collaborator app surfaces: a collaborator may only enter a project
 * route whose id is in the set of projects they were invited to. Pair with
 * `listCollaboratorProjects()` from `lib/server/collaborator-mode.ts`.
 */
export function collaboratorCanAccessProject(
  invitedProjectIds: readonly string[],
  projectId: string,
): boolean {
  return invitedProjectIds.includes(projectId);
}
