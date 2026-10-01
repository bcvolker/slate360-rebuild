import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Productization Slice 2 (Opus review): the Phase-1 client portal must never surface SaaS/
 * subscription-product language — Slate360 is a service business, not a seat-based/marketplace
 * product. A simple absence-of-banned-words scan over the actual client-facing source tree, not a
 * character-for-character copy assertion (which would be brittle and isn't what this is guarding
 * against). Owner/ops tooling is excluded — it's an internal operations console, not the client
 * product, and normal operational and billing-adjacent vocabulary is expected there.
 */

const CLIENT_ROOTS = ["app/vnext/(client)", "components/vnext"];
const EXCLUDED_DIRS = new Set(["owner", "ops"]);

const BANNED_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Upgrade (SaaS upsell)", pattern: /\bUpgrade\b/ },
  { label: "Subscription", pattern: /\bSubscription\b/i },
  { label: "Seats", pattern: /\bSeats?\b(?!\s*(row|walk))/ },
  { label: "Billing tier", pattern: /\bBilling tier\b/i },
  { label: "Usage meter", pattern: /\bUsage meter\b/i },
  { label: "marketplace", pattern: /\bmarketplace\b/i },
  { label: "add-on (sales)", pattern: /\badd-on\b/i },
  { label: "locked module", pattern: /\blocked module\b/i },
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) files.push(full);
  }
  return files;
}

describe("client portal source — no SaaS/subscription language", () => {
  const files = CLIENT_ROOTS.flatMap((root) => walk(root));

  it("scans a non-trivial number of client source files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const { label, pattern } of BANNED_PATTERNS) {
    it(`never mentions "${label}" anywhere in the client portal source tree`, () => {
      const hits = files.filter((file) => pattern.test(readFileSync(file, "utf8")));
      expect(hits, hits.join("\n")).toEqual([]);
    });
  }
});
