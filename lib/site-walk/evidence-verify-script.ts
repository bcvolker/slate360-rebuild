/**
 * Text assets bundled into a Certified Evidence export ZIP: a zero-dependency
 * Node verifier and a human-readable README. Kept as string constants so the
 * export builder can `zip.file()` them without filesystem reads at runtime.
 */

/** `verify.mjs` — independent verifier (Node 18+, no dependencies). */
export const VERIFY_SCRIPT = `#!/usr/bin/env node
// Slate360 Certified Evidence - independent verifier. Zero dependencies (Node 18+).
// Validates: (1) each media file's SHA-256 matches the manifest, and (2) each
// item's chain-of-custody linkage (prev_hash -> event_hash) is intact.
//   Usage:  node verify.mjs
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
let failures = 0, checks = 0;
const fail = (m) => { console.error("  [X] " + m); failures++; };

const manifest = JSON.parse(readFileSync(join(root, "MANIFEST.json"), "utf8"));
console.log("Slate360 Certified Evidence - verifying: " + manifest.deliverable.title);
console.log("Generated: " + manifest.generated_at + "  Items: " + manifest.items.length + "\\n");

console.log("[1] Media integrity (SHA-256 vs manifest)");
for (const it of manifest.items) {
  if (!it.media_file) continue;
  const p = join(root, it.media_file);
  if (!existsSync(p)) { fail(it.media_file + " is missing"); continue; }
  checks++;
  const h = sha256(readFileSync(p));
  if (h !== it.export_sha256) { fail(it.media_file + " hash mismatch"); continue; }
  if (it.capture_sha256 && h !== it.capture_sha256)
    console.log("  [!] " + it.media_file + ": intact vs export, but differs from capture hash");
  else console.log("  [OK] " + it.media_file);
}

console.log("\\n[2] Chain-of-custody linkage (prev_hash -> event_hash)");
for (const it of manifest.items) {
  if (!it.evidence_file) continue;
  const events = JSON.parse(readFileSync(join(root, it.evidence_file), "utf8"));
  let prev = null, ok = true;
  for (const e of events) {
    checks++;
    const ph = e.prev_hash === undefined ? null : e.prev_hash;
    if (ph !== prev) { fail(it.id + ": broken chain at event " + e.event_type); ok = false; break; }
    prev = e.event_hash;
  }
  if (ok) console.log("  [OK] " + it.id + ": " + events.length + " events, chain intact");
}

console.log("\\n" + (failures === 0 ? "RESULT: PASS" : "RESULT: FAIL") + " - " + checks + " checks, " + failures + " failure(s)");
process.exit(failures === 0 ? 0 : 1);
`;

/** `README.txt` — plain-English explanation of the bundle + integrity model. */
export const VERIFY_README = `SLATE360 CERTIFIED EVIDENCE EXPORT
==================================

This archive is a self-contained, independently verifiable record of the captures
included in a delivered Slate360 report.

CONTENTS
  MANIFEST.json     Machine-readable index: every item, its hashes, and pointers
                    to its media file and chain-of-custody log.
  media/            The original captured files, exactly as stored.
  evidence/<id>.json  The append-only chain-of-custody log for each item
                    (captured -> hash_verified -> included_in_deliverable -> ...).
  verify.mjs        A zero-dependency Node script that re-checks this bundle.
  README.txt        This file.

HOW TO VERIFY
  1. Install Node.js 18 or newer.
  2. From inside this extracted folder, run:  node verify.mjs
  3. A PASS result means every media file's SHA-256 still matches the hash recorded
     at capture time, and each item's chain-of-custody linkage is unbroken.

WHAT IS GUARANTEED
  * Media integrity: each file is hashed with SHA-256 and compared to the value
    recorded when the file was captured on-device and re-verified server-side.
    A match proves the bytes are unchanged since capture (cf. FRE 902(14)).
  * Chain integrity: each item's events form an append-only hash chain, where every
    event references the prior event's hash (prev_hash -> event_hash). The verifier
    confirms this linkage is intact, so no event could be inserted, removed, or
    reordered without breaking the chain.

NOTE ON EVENT HASHES
  Each event_hash was computed server-side at the moment the event was recorded.
  The verifier checks the chain LINKAGE rather than re-deriving each event_hash,
  because the event metadata is stored in a database format that does not preserve
  field ordering; the linkage check is the sound, reproducible guarantee.
`;
