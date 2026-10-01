import type { ProjectItem, ProjectItemType } from "./project-items";

function pinTypeToItem(pinType: string): ProjectItemType {
  if (pinType === "issue") return "issue";
  if (pinType === "rfi") return "rfi_reference";
  if (pinType === "note") return "question";
  if (pinType === "voice") return "voice_note";
  return "general";
}

export function pinRowToProjectItem(
  pin: {
    id: string;
    project_id?: string | null;
    label?: string | null;
    body?: string | null;
    pin_type?: string | null;
    status?: string | null;
    visibility?: string | null;
    created_at?: string | null;
    walkthrough_id?: string | null;
    clip_id?: string | null;
    t_seconds?: number | null;
    yaw_deg?: number | null;
    pitch_deg?: number | null;
  },
  projectId: string,
): ProjectItem {
  const status = pin.status === "closed" ? "closed" : pin.status === "in_progress" ? "in_progress" : "open";
  const vis = pin.visibility === "public" ? "public" : pin.visibility === "internal" ? "internal" : "client";
  return {
    id: pin.id,
    projectId: pin.project_id || projectId,
    type: pinTypeToItem(pin.pin_type ?? "note"),
    title: pin.label || "Project item",
    description: pin.body ?? null,
    status,
    priority: pin.pin_type === "rfi" ? "high" : "normal",
    assigneeId: null,
    dueDate: null,
    createdBy: null,
    guestKey: null,
    visibility: vis,
    createdAt: pin.created_at ?? new Date().toISOString(),
    closedAt: status === "closed" ? pin.created_at ?? null : null,
    locators: [
      {
        walkthroughId: pin.walkthrough_id ?? null,
        clipId: pin.clip_id ?? null,
        chapterId: null,
        tSeconds: pin.t_seconds ?? null,
        yawDeg: pin.yaw_deg ?? null,
        pitchDeg: pin.pitch_deg ?? null,
      },
    ],
  };
}
