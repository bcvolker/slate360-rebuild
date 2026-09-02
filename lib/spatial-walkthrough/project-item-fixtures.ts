import type { ProjectItem, ProjectItemActivity, ProjectItemComment } from "./project-items";
import type { ProjectDocument } from "./project-documents";

const locator = {
  id: "loc-1",
  walkthroughId: "wt-housewalk",
  clipId: "clip-housewalk",
  chapterId: "ch-lobby",
  tSeconds: 12.4,
  yawDeg: 18,
  pitchDeg: -6,
};

export const FIXTURE_QUESTION: ProjectItem = {
  id: "item-q1",
  projectId: "proj-1",
  type: "question",
  title: "What clearance is required at this damper?",
  description: "Asked from the corridor hold.",
  status: "open",
  priority: "normal",
  assigneeId: null,
  dueDate: null,
  createdBy: "client-1",
  guestKey: null,
  visibility: "client",
  createdAt: "2026-08-30T16:00:00.000Z",
  closedAt: null,
  locators: [locator],
};

export const FIXTURE_INTERNAL: ProjectItem = {
  ...FIXTURE_QUESTION,
  id: "item-internal",
  type: "issue",
  title: "Internal coordination hold",
  visibility: "internal",
  createdBy: "contractor-1",
};

export const FIXTURE_ACTION: ProjectItem = {
  ...FIXTURE_QUESTION,
  id: "item-issue",
  type: "issue",
  title: "Damper clearance — action item",
  status: "in_progress",
  priority: "high",
  assigneeId: "user-foreman",
  dueDate: "2026-09-04",
};

export const FIXTURE_COMMENTS: ProjectItemComment[] = [
  {
    id: "c1",
    itemId: "item-q1",
    authorId: "client-1",
    text: "Please confirm the spec note on sheet M-401.",
    voiceAssetId: null,
    fileDocumentId: null,
    createdAt: "2026-08-30T16:01:00.000Z",
  },
  {
    id: "c2",
    itemId: "item-q1",
    authorId: "contractor-1",
    text: "Voice reply on the hold.",
    voiceAssetId: "asset-voice-1",
    fileDocumentId: null,
    createdAt: "2026-08-30T16:10:00.000Z",
  },
];

export const FIXTURE_ACTIVITY: ProjectItemActivity[] = [
  { id: "a1", itemId: "item-q1", kind: "created", actorId: "client-1", createdAt: "2026-08-30T16:00:00.000Z", payload: {} },
  { id: "a2", itemId: "item-q1", kind: "commented", actorId: "client-1", createdAt: "2026-08-30T16:01:00.000Z", payload: {} },
  { id: "a3", itemId: "item-issue", kind: "assigned", actorId: "contractor-1", createdAt: "2026-08-30T16:20:00.000Z", payload: { assigneeId: "user-foreman" } },
];

export const FIXTURE_DOCS: ProjectDocument[] = [
  {
    id: "doc-m401",
    projectId: "proj-1",
    type: "drawing",
    title: "M-401 Mechanical",
    slatedropId: "sd-1",
    sourceProvider: "procore",
    sourceExternalId: "pc-8821",
    sourceUrl: "https://app.procore.com/drawings/8821",
  },
  {
    id: "doc-thermal",
    projectId: "proj-1",
    type: "thermal_image",
    title: "Corridor thermal still",
    slatedropId: "sd-thermal",
    sourceProvider: "slatedrop",
    sourceExternalId: null,
    sourceUrl: null,
  },
];

export const FIXTURE_ITEMS: ProjectItem[] = [FIXTURE_QUESTION, FIXTURE_INTERNAL, FIXTURE_ACTION];
