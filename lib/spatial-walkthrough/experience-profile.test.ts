import { describe, expect, it } from "vitest";

import { configForProfile, parseExperienceProfile } from "./experience-profile";

describe("experience profile", () => {
  it("defaults unknown values to marketing and keeps the spatial engine uninvolved", () => {
    expect(parseExperienceProfile("nope")).toBe("marketing");
    expect(configForProfile("marketing").hideProjectManagement).toBe(true);
    expect(configForProfile("construction").measure).toBe(true);
    expect(configForProfile("wayfinding").destination).toBe(true);
  });
});
