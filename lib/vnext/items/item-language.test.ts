import { describe, expect, it } from "vitest";
import { itemMatchesQuery, statusMatchesFilter } from "./item-language";
import { prepareQuestionBody } from "./question-body";
import { PREVIEW_ITEM_PLAN } from "../preview-items-fixtures";

describe("item filters", () => {
  it("groups open with in progress, and resolved with closed", () => {
    expect(statusMatchesFilter("open", "open")).toBe(true);
    expect(statusMatchesFilter("in_progress", "open")).toBe(true);
    expect(statusMatchesFilter("resolved", "open")).toBe(false);
    expect(statusMatchesFilter("verified", "closed")).toBe(true);
    expect(statusMatchesFilter("closed", "closed")).toBe(true);
    expect(statusMatchesFilter("na", "closed")).toBe(false);
    expect(statusMatchesFilter("na", "all")).toBe(true);
  });

  it("searches title, description, location, trade, and tags", () => {
    expect(itemMatchesQuery(PREVIEW_ITEM_PLAN, "shaft")).toBe(true);
    expect(itemMatchesQuery(PREVIEW_ITEM_PLAN, "east corridor")).toBe(true);
    expect(itemMatchesQuery(PREVIEW_ITEM_PLAN, "mechanical")).toBe(true);
    expect(itemMatchesQuery(PREVIEW_ITEM_PLAN, "ceiling")).toBe(true);
    expect(itemMatchesQuery(PREVIEW_ITEM_PLAN, "not-a-term")).toBe(false);
  });
});

describe("prepareQuestionBody", () => {
  it("trims and rejects empty or oversized text", () => {
    expect(prepareQuestionBody("  hello  ")).toEqual({ ok: true, body: "hello" });
    expect(prepareQuestionBody("   ").ok).toBe(false);
    expect(prepareQuestionBody("x".repeat(4001)).ok).toBe(false);
  });
});
