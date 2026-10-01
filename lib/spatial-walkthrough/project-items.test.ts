import { describe, expect, it } from "vitest";
import {
  applyStatus,
  canCommentOnItem,
  canManageItem,
  captureAskLocator,
  convertQuestionToAction,
  filterItemList,
  itemAccessDenied,
  itemVisibleTo,
  listPayload,
  pinIsLightweight,
  summarizeVisible,
  visibleItems,
  walkthroughHref,
  type ProjectItem,
} from "./project-items";
import {
  clientMayAttach,
  procoreDeepLink,
  reuseDocumentAcrossItems,
  thermalStudioHref,
  thermalStudioUnlocked,
  uniqueDocuments,
} from "./project-documents";
import { inAppNotificationCopy, makeItemEvent, planNotifications } from "./item-events";
import { FIXTURE_ACTION, FIXTURE_DOCS, FIXTURE_INTERNAL, FIXTURE_ITEMS, FIXTURE_QUESTION } from "./project-item-fixtures";
import { parseShareLocator, serializeShareLocator } from "./share-locator";

const hidden: ProjectItem = FIXTURE_INTERNAL;
const question: ProjectItem = FIXTURE_QUESTION;
const action: ProjectItem = FIXTURE_ACTION;

describe("authorization and hidden objects", () => {
  it("lets contractors see every scope and clients only public/client", () => {
    expect(itemVisibleTo("internal", "contractor")).toBe(true);
    expect(itemVisibleTo("internal", "client")).toBe(false);
    expect(itemVisibleTo("client", "client")).toBe(true);
    expect(itemVisibleTo("public", "public")).toBe(true);
    expect(itemVisibleTo("client", "public")).toBe(false);
    expect(itemVisibleTo("bidder", "bidder")).toBe(true);
    expect(itemVisibleTo("consultant", "client")).toBe(false);
  });

  it("never lists or counts hidden items for unauthorized clients", () => {
    const visible = visibleItems(FIXTURE_ITEMS, "client", "client-1");
    expect(visible.map((i) => i.id)).toEqual(["item-q1", "item-issue"]);
    expect(visible.some((i) => i.id === "item-internal")).toBe(false);
    expect(summarizeVisible(FIXTURE_ITEMS, "client", "client-1")).toEqual({ count: 2 });
    expect(listPayload(visible)).not.toHaveProperty("hiddenCount");
    expect(listPayload(visible)).not.toHaveProperty("total");
  });

  it("returns the same denial for missing and unauthorized items", () => {
    expect(itemAccessDenied(null, "client")).toBe(true);
    expect(itemAccessDenied(hidden, "client")).toBe(true);
    expect(itemAccessDenied(question, "client", "client-1")).toBe(false);
  });

  it("lets an asker see their own question even on a public share", () => {
    expect(itemVisibleTo("client", "public", "guest", null, "gk-1", "gk-1")).toBe(true);
    expect(itemVisibleTo("client", "public", "guest", null, "gk-1", "gk-other")).toBe(false);
  });
});

describe("comment and manage permissions", () => {
  it("allows client comments and contractor management", () => {
    expect(canCommentOnItem({ audience: "client", canAuthor: false })).toBe(true);
    expect(canCommentOnItem({ audience: "public", canAuthor: false })).toBe(false);
    expect(canCommentOnItem({ audience: "contractor", canAuthor: true })).toBe(true);
    expect(canManageItem("client", false)).toBe(false);
    expect(canManageItem("contractor", true)).toBe(true);
  });
});

describe("status and convert", () => {
  it("converts a discussion into an action item", () => {
    const next = convertQuestionToAction(question, "punch");
    expect(next.type).toBe("punch");
    expect(next.id).toBe(question.id);
  });

  it("closes and reopens with closedAt", () => {
    const closed = applyStatus(action, "closed", "2026-08-30T18:00:00.000Z");
    expect(closed.status).toBe("closed");
    expect(closed.closedAt).toBe("2026-08-30T18:00:00.000Z");
    expect(applyStatus(closed, "open", "2026-08-30T18:01:00.000Z").closedAt).toBeNull();
  });
});

describe("locator deep links", () => {
  it("captures ask-about-this view and serializes open-in-walkthrough", () => {
    const loc = captureAskLocator({
      walkthroughId: "wt-housewalk",
      clipId: "clip-housewalk",
      chapterId: "ch-lobby",
      t: 12.4,
      yaw: 18,
      pitch: -6,
    });
    expect(loc).toMatchObject({ clipId: "clip-housewalk", chapterId: "ch-lobby", tSeconds: 12.4, yawDeg: 18, pitchDeg: -6 });
    const href = walkthroughHref({ basePath: "/w/tok", locator: loc });
    expect(href).toContain("clip=clip-housewalk");
    expect(href).toContain("chapter=ch-lobby");
    expect(href).toContain("t=12.4");
    expect(href).toContain("yaw=18");
    expect(href).toContain("pitch=-6");
    const parsed = parseShareLocator(href.split("?")[1] ?? "");
    expect(parsed.clipId).toBe("clip-housewalk");
    expect(parsed.tSeconds).toBe(12.4);
  });

  it("round-trips item id on share locators", () => {
    const qs = serializeShareLocator({
      walkthroughId: null,
      clipId: "clip-housewalk",
      chapterId: "ch-lobby",
      tSeconds: 4,
      yawDeg: 1,
      pitchDeg: 0,
      pinId: null,
      itemId: "item-q1",
    });
    expect(qs).toContain("item=item-q1");
    expect(parseShareLocator(qs).itemId).toBe("item-q1");
  });
});

describe("project-file reuse and thermal isolation", () => {
  it("attaches one document to many items", () => {
    const links = reuseDocumentAcrossItems("doc-m401", ["item-q1", "item-issue"]);
    expect(links).toHaveLength(2);
    expect(uniqueDocuments(FIXTURE_DOCS.concat(FIXTURE_DOCS))).toHaveLength(2);
  });

  it("keeps Procore as a deep link only", () => {
    const link = procoreDeepLink(FIXTURE_DOCS[0]);
    expect(link).toEqual({
      provider: "procore",
      externalId: "pc-8821",
      url: "https://app.procore.com/drawings/8821",
    });
  });

  it("does not unlock Thermal Studio from a thermal JPG", () => {
    expect(thermalStudioUnlocked({ type: "thermal_image" })).toBe(false);
    expect(thermalStudioHref({ type: "thermal_image" })).toBeNull();
    expect(clientMayAttach("photo")).toBe(true);
    expect(clientMayAttach("contract")).toBe(false);
  });

  it("keeps pins lightweight when they have no project item", () => {
    expect(pinIsLightweight(null)).toBe(true);
    expect(pinIsLightweight("item-q1")).toBe(false);
  });
});

describe("filters and notifications", () => {
  it("filters contractor lists by assignee and status", () => {
    expect(filterItemList(FIXTURE_ITEMS, { status: "in_progress" }).map((i) => i.id)).toEqual(["item-issue"]);
    expect(filterItemList(FIXTURE_ITEMS, { assigneeId: "user-foreman" }).map((i) => i.id)).toEqual(["item-issue"]);
    expect(filterItemList(FIXTURE_ITEMS, { mine: true, viewerId: "client-1" }).map((i) => i.id)).toEqual(["item-q1", "item-issue"]);
  });

  it("plans in-app copy and stubs email/push", () => {
    const event = makeItemEvent("assigned", "item-issue", "proj-1", "contractor-1", { assigneeId: "user-foreman" });
    const plan = planNotifications(event);
    expect(plan.find((p) => p.channel === "in_app")?.status).toBe("queued");
    expect(plan.find((p) => p.channel === "email")?.status).toBe("stubbed");
    expect(plan.find((p) => p.channel === "push")?.status).toBe("stubbed");
    expect(inAppNotificationCopy(event)?.linkPath).toBe("/projects/proj-1/items");
  });
});
