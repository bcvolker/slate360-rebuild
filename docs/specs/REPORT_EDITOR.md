# Spec: Report Editor

Status: **spec / planning** (no app code). The authoring surface that produces the block model in
`REPORT_BLOCK_SCHEMA.md` and emits the three outputs (web / PDF / email-SMS). Desktop-first power
tool; mobile gets one-tap quick-generate.

## 1. Inputs & output
- **Input:** a walk / twin / progression / photo batch (or blank), plus the project record (for
  branding + location).
- **Output:** a `Report` (`reports.report_json` snapshot) → web link (`/view`-style render), PDF
  (Puppeteer in Trigger/Modal), email/SMS delivery; live `report_comments` thread.

## 2. Desktop layout
```
┌ Blocks (left) ┬──────── Canvas (center, live preview) ────────┬ Inspector (right) ┐
│ + Add block ▾ │  [vertical | horizontal]  [1-col | 2-col]     │ selected block:   │
│ ⠿ Cover       │                                               │  type fields      │
│ ⠿ Summary     │   WYSIWYG of the chosen layout/mode           │  layout hints     │
│ ⠿ Photo grid  │   (drag to reorder; click to select)          │  (column/fullbleed│
│ ⠿ Before/After│                                               │   /break)         │
│ ⠿ Voice memo  │                                               │ —or— Report:      │
│ ⠿ Twin embed  │                                               │  branding, layout,│
│ …             │                                               │  sharing, export  │
└───────────────┴───────────────────────────────────────────────┴───────────────────┘
```
- **Reorder:** `@dnd-kit/core` drag handles on the block list (and within 2-col canvas).
- **Add block:** palette → heading, text, photo, before/after, media-embed, voice-memo,
  embedded-file, callout, divider, map, scorecard.
- **Select nothing** → Inspector shows report-level settings (branding auto-filled from project,
  default layout, columns, `allowLayoutToggle`, sharing/permissions, export).

## 3. Per-block editing (Inspector)
- **photo:** pick from walk/SlateDrop; caption; **annotation editor** (arrow/rect/circle/label/
  measurement → stored as normalized SVG `Annotation[]`).
- **beforeAfter:** pick a progression `pairId` (auto-fills both) or two photos; shared caption + note.
- **mediaEmbed:** pick twin/360/tour/video/gallery → stores `manifestRef` + poster; preview mounts
  the chrome-less `SlatePlayer`.
- **voiceMemo (3 modes):** record/upload `.m4a`; buttons **Transcribe** (Whisper) and **Enhance**
  (AI → report-format prose); `displayMode` selector (audio / audio+transcript / audio+enhanced /
  enhanced+audio). Each AI action shows a **token estimate + confirm** before dispatch.
- **embeddedFile:** pick a SlateDrop file; choose preview kind; `allowDownload` (respects
  `folder_permissions`).
- **scorecard/map/text/callout:** simple field forms.

## 4. Layout & mode controls
- Toolbar toggles: **vertical / horizontal** (default), **1-col / 2-col** (vertical only),
  `allowLayoutToggle` (let the viewer switch). Canvas re-renders live so the author sees exactly
  what the recipient gets in each mode.
- Per-block `layoutHints`: column (left/right/full), fullBleed, breakBefore (PDF/slide).

## 5. Branding (automatic)
Pulled from the project: logo, accent color, client name, location. Author can override per report.
Cover block uses it; PDF header/footer uses it; no manual rebranding.

## 6. Generate & share
- **Save** → `report_json` snapshot (status `draft`).
- **Generate web link** → token (`/view/[token]`-style), set `allowDownload`/`allowComments`.
- **Generate PDF** → enqueue Trigger task → Puppeteer renders the vertical layout in Modal →
  store in SlateDrop/R2 → notify when ready. **Token estimate + confirm** (heavy render).
- **Send** → email (Resend) / SMS (Twilio) with link (+ optional PDF attachment).
- Two-way comments enabled on the shared link; replies notify via the notification service.

## 7. Mobile (quick-generate)
From a walk review: **"Generate report"** → pick template (Site Report / Before-After / Twin
Summary) → auto-assemble blocks from the walk → choose layout → share. Full block editing stays on
desktop; mobile supports light edits (caption, reorder, remove, record a voice memo).

## 8. Templates (seed block sets)
Site Walk Summary, Before/After Progression, Twin 360 Summary, Punch List. Each is a starter
`blocks[]` the editor populates from the source, then the author refines.

## 9. Token touchpoints
Confirm-before-spend on: voice transcription, voice enhancement, PDF render, any media processing
triggered from the editor. Free: editing, text/photo blocks, web link generation.

## 10. Build order
1. Editor shell (block list + canvas + inspector) reading/writing `report_json`.
2. Core blocks (heading/text/photo/callout/divider/scorecard) + vertical 1-col render.
3. Reorder (dnd-kit) + 2-col + horizontal mode toggle.
4. mediaEmbed (SlatePlayer) + beforeAfter (progression pairs) + annotation editor.
5. voiceMemo (record → transcribe → enhance, 3 modes) + embeddedFile.
6. Generate web/PDF/send + comments + mobile quick-generate.

## 11. Open items
- Autosave/versioning of `report_json`.
- Per-block comments (phase 2; anchor via `Block.anchorId`).
- Template management / custom org templates (enterprise).
