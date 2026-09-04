/**
 * AOB205 — ASU West, DSL Classroom TI. Real capture (17 Aug 2026): X4 360
 * stations (downscaled), the stitched walk (45 s local proxy, not committed),
 * sheet A803, and the candidate Gaussian (hidden from clients by capability).
 *
 * AUTHORED_APPROXIMATE: plan positions and station↔walk times were placed by
 * hand against A803. Replace with registered positions from the processor.
 */
import type { ProjectItem, Station, Waypoint } from "./types";

export const A = "/preview/aob205";
export const AM = "2026-08-17T09:35:00-07:00";
export const PM = "2026-08-17T15:22:00-07:00";
/** Proxy starts 15 s into source clip 107; AOB205's known break is at source 129.2–130 s. */
export const PROXY_OFFSET_S = 15;
export const PROXY_DURATION_S = 45;

const wp = (id: string, t: number, label: string, space: string, u: number, v: number): Waypoint => ({
  id, t, label, space, u, v, forwardYaw: 0, segmentId: "0",
});

export const waypoints: Waypoint[] = [
  wp("w0", 0, "Entry — northwest door", "Entry", 0.612, 0.352),
  wp("w1", 6, "Left aisle", "Seating", 0.612, 0.48),
  wp("w2", 12, "Left aisle, rear", "Seating", 0.612, 0.62),
  wp("w3", 18, "Instructor station", "Instructor area", 0.7, 0.7),
  wp("w4", 24, "Right aisle, rear", "Seating", 0.8, 0.62),
  wp("w5", 30, "Right aisle", "Seating", 0.8, 0.48),
  wp("w6", 36, "Front rows", "Seating", 0.75, 0.39),
  wp("w7", 42, "Northeast door", "Entry", 0.812, 0.32),
];

const st = (
  n: number, visitId: string, label: string, space: string, u: number, v: number, at: string, t: number | null, neighbors: [string, number][],
): Station => ({
  id: `s${String(n).padStart(2, "0")}`,
  visitId, label, space, u, v, capturedAt: at, t,
  imageUrl: `${A}/stations/s${String(n).padStart(2, "0")}.jpg`,
  thumbUrl: `${A}/stations/s${String(n).padStart(2, "0")}-thumb.jpg`,
  northYaw: 0,
  neighbors: neighbors.map(([id, yawDeg]) => ({ id, yawDeg })),
});

export const stations: Station[] = [
  st(1, "v-am", "Entry, northwest door", "Entry", 0.62, 0.36, "2026-08-17T09:35:21-07:00", 1, [["s02", 160], ["s08", 90]]),
  st(2, "v-am", "Front rows, left", "Seating", 0.66, 0.44, "2026-08-17T09:37:00-07:00", 5, [["s01", -20], ["s03", 150], ["s04", 190]]),
  st(3, "v-am", "Room centre", "Seating", 0.70, 0.50, "2026-08-17T09:38:56-07:00", 33, [["s02", -30], ["s04", -140], ["s05", 140], ["s06", 180]]),
  st(4, "v-am", "Left aisle, rear", "Seating", 0.62, 0.58, "2026-08-17T09:41:17-07:00", 12, [["s02", 10], ["s03", 40], ["s07", 150]]),
  st(5, "v-am", "Right aisle, rear", "Seating", 0.78, 0.58, "2026-08-17T09:43:14-07:00", 25, [["s03", -40], ["s07", -150], ["s08", 0]]),
  st(6, "v-am", "Rear seating", "Seating", 0.70, 0.66, "2026-08-17T09:45:18-07:00", 21, [["s03", 0], ["s07", 180]]),
  st(7, "v-am", "Instructor station", "Instructor area", 0.70, 0.74, "2026-08-17T09:47:22-07:00", 18, [["s06", 0], ["s04", -40], ["s05", 40]]),
  st(8, "v-am", "Northeast door", "Entry", 0.80, 0.34, "2026-08-17T09:48:00-07:00", 43, [["s01", -90], ["s05", 180]]),
  st(9, "v-pm", "Room centre", "Seating", 0.70, 0.50, "2026-08-17T15:22:17-07:00", null, [["s10", -140], ["s11", 140], ["s12", 180]]),
  st(10, "v-pm", "Left aisle, rear", "Seating", 0.63, 0.62, "2026-08-17T15:23:02-07:00", null, [["s09", 40], ["s12", 150]]),
  st(11, "v-pm", "Right aisle, rear", "Seating", 0.78, 0.62, "2026-08-17T15:24:00-07:00", null, [["s09", -40], ["s12", -150]]),
  st(12, "v-pm", "Instructor station", "Instructor area", 0.70, 0.72, "2026-08-17T15:35:20-07:00", null, [["s09", 0], ["s10", -40], ["s11", 40]]),
];

export const a803Doc = {
  id: "d-a803", title: "Enlarged Furniture Plan — Room 205", kind: "pdf" as const,
  url: `${A}/A803.pdf`, thumbUrl: `${A}/doc-a803.jpg`, meta: "A803 · RSP Architects · 02/13/26",
};

export const items: ProjectItem[] = [
  {
    id: "i-101",
    title: "Credenza clearance at rear wall",
    type: "rfi",
    status: "open",
    author: "Slate360",
    description:
      "A803 shows a 10'-0\" credenza by DSL centred on the rear wall with 2'-6\" to the instructor desk. Field conditions at the rear wall show a floor box that may conflict with the credenza footprint. Please confirm the credenza location or advise on relocating the floor box.",
    createdAt: "2026-08-18T08:12:00-07:00",
    refs: [
      { kind: "plan", label: "Rear wall, credenza", u: 0.70, v: 0.805 },
      { kind: "walkthrough", label: "Front wall, credenza and instructor desk", t: 32, yaw: -55, pitch: -8 },
      { kind: "station", label: "Instructor station (AM)", stationId: "s07", yaw: 180, pitch: -14 },
      { kind: "twin", label: "Rear wall", xyz: [0.2, -0.9, 3.1] },
    ],
    attachments: [a803Doc],
    comments: [
      { id: "c1", author: "J. Alvarez", role: "client", at: "2026-08-18T10:40:00-07:00", body: "Can you show the floor box in the 360 so we can send it to RSP?" },
      { id: "c2", author: "Brian Volker", role: "slate360", at: "2026-08-18T11:05:00-07:00", body: "Added the instructor-station 360 from the morning visit; the floor box is visible facing the rear wall. Location marked on A803." },
    ],
    activity: [
      { id: "a1", at: "2026-08-18T08:12:00-07:00", summary: "Opened from the walkthrough" },
      { id: "a2", at: "2026-08-18T11:05:00-07:00", summary: "360 station and A803 reference attached" },
    ],
  },
  {
    id: "i-104",
    title: "Is the floor box at the rear wall live power or data?",
    type: "question",
    status: "resolved",
    author: "J. Alvarez",
    description: "Facilities needs to know before the credenza is set. Asked from the instructor station.",
    createdAt: "2026-08-18T13:20:00-07:00",
    refs: [
      { kind: "station", label: "Instructor station (AM), facing rear wall", stationId: "s07", yaw: 175, pitch: -20 },
      { kind: "plan", label: "Rear wall floor box", u: 0.705, v: 0.79 },
    ],
    attachments: [],
    comments: [
      { id: "c3", author: "J. Alvarez", role: "client", at: "2026-08-18T13:20:00-07:00", body: "Is the floor box at the rear wall live power or data?" },
      { id: "c4", author: "Brian Volker", role: "slate360", at: "2026-08-18T14:02:00-07:00", body: "Both — a duplex receptacle and two data ports, per the cover plate visible in the station view. Marked resolved." },
    ],
    activity: [
      { id: "a6", at: "2026-08-18T13:20:00-07:00", summary: "Question asked from a 360 station" },
      { id: "a7", at: "2026-08-18T14:02:00-07:00", summary: "Answered and resolved" },
    ],
  },
  {
    id: "i-102",
    title: "Railing and slope at northeast entry",
    type: "issue",
    status: "in_progress",
    author: "Slate360",
    description:
      "A803 calls for a railing at the northeast entry ramp (UP, SLOPE). Railing posts are not yet installed; verify anchor locations against the 3'-2\" minimum clear.",
    createdAt: "2026-08-18T09:02:00-07:00",
    refs: [
      { kind: "plan", label: "Northeast entry", u: 0.815, v: 0.31 },
      { kind: "station", label: "Northeast door (AM)", stationId: "s08", yaw: 20, pitch: -10 },
      { kind: "walkthrough", label: "Approaching northeast door", t: 42, yaw: 0, pitch: -8 },
    ],
    attachments: [a803Doc],
    comments: [],
    activity: [{ id: "a3", at: "2026-08-18T09:02:00-07:00", summary: "Opened from 360 documentation" }],
  },
  {
    id: "i-103",
    title: "Projector location vs. room 205 label",
    type: "note",
    status: "resolved",
    author: "Slate360",
    description: "Ceiling projector is mounted forward of the position implied by the furniture plan. Noted for the AV coordination set; no action required.",
    createdAt: "2026-08-17T16:20:00-07:00",
    refs: [
      { kind: "plan", label: "Centre of room", u: 0.70, v: 0.60 },
      { kind: "walkthrough", label: "Looking up at the projector", t: 43, yaw: -20, pitch: 30 },
    ],
    attachments: [],
    comments: [],
    activity: [
      { id: "a4", at: "2026-08-17T16:20:00-07:00", summary: "Note added" },
      { id: "a5", at: "2026-08-19T07:30:00-07:00", summary: "Marked resolved" },
    ],
  },
];
