# Report Block Schema — the shared contract (web + PDF + editor)

Status: **planning / spec** (no app code). The single data model consumed by the vertical
renderer, the horizontal cinematic renderer, the Puppeteer PDF renderer, and the report editor.
Companion to `RESEARCH_SYNTHESIS_AND_DECISIONS.md` §4.

Principle: **a report is an ordered list of typed blocks + an envelope.** Layout (vertical vs
horizontal, 1- vs 2-column) and output (web / PDF / email) are *render concerns*; the blocks are
the source of truth. Generalizes today's `SharedDeliverableDocument` (vertical) and
`DeliverableSlideshow` (horizontal).

---

## 1. Envelope

```ts
type Report = {
  id: string;
  orgId: string;
  projectId: string;                 // branding/location inherited from the project record
  sourceType: "walk" | "twin" | "progression" | "photo_batch" | "manual";
  sourceId?: string;
  title: string;
  reportType: "site_walk" | "before_after" | "twin_summary" | "punch_list" | "custom";
  status: "draft" | "ready" | "shared";
  createdBy: string;
  createdAt: string;

  // Branding is auto-pulled from the project (logo, brand color, client, location).
  branding: { logoUrl?: string; accentColor?: string; clientName?: string };

  // Render preferences (the CEO dual-layout requirement)
  defaultLayout: "vertical" | "horizontal";
  verticalColumns: 1 | 2;            // 1 = single-file scroll, 2 = side-by-side
  allowLayoutToggle: boolean;        // can the viewer switch vertical<->horizontal

  blocks: Block[];

  sharing: {
    token: string;
    allowDownload: boolean;          // download embedded files / PDF
    allowComments: boolean;          // two-way thread
    expiresAt?: string;
  };
  // Two-way comms (report-level for v1, per CEO)
  thread: CommentThreadRef;
};
```

## 2. Block base

```ts
type Block = {
  id: string;
  type: BlockType;
  order: number;
  title?: string;
  caption?: string;
  anchorId?: string;                 // for table-of-contents / deep links
  layoutHints?: {
    fullBleed?: boolean;             // span both columns / full slide
    column?: "left" | "right" | "full";  // placement in 2-column vertical
    breakBefore?: boolean;           // force a PDF page break / new slide
    avoidBreak?: boolean;            // PDF: break-inside: avoid (default true for media/pairs)
  };
  metadata?: Record<string, unknown>;
};
```

## 3. Block types

```ts
type BlockType =
  | "heading" | "text" | "callout" | "divider" | "scorecard" | "map"
  | "photo" | "beforeAfter" | "mediaEmbed" | "voiceMemo" | "embeddedFile";
```

- **heading** `{ level: 1|2|3; text }`
- **text** `{ richText }` — markdown/rich text; uses the » chevron list style for findings.
- **callout** `{ variant: "info"|"warning"|"issue"|"success"; text; severity? }`
- **divider** `{}`
- **scorecard** `{ items: { label; value; unit? }[] }` — exec-summary metrics (tabular nums).
- **map** `{ lat; lng; boundary?; staticImageUrl }` — site overview; `staticImageUrl` is the
  pre-rendered tile used in PDF (Leaflet can't render in headless reliably).
- **photo** `{ fileId; url; thumbUrl?; annotations: Annotation[]; location?; timestamp?; author? }`
- **beforeAfter** `{ before: PhotoRef; after: PhotoRef; sharedCaption?; note?; pairId? }` — `pairId`
  comes from ghost progression; web shows a slider, PDF shows side-by-side.
- **mediaEmbed** `{ mediaKind: "twin"|"pano360"|"tour"|"video"|"gallery"; manifestRef; poster;
  initialState? }` — renders via the unified `SlatePlayer`; **PDF → poster image + QR/link**.
- **voiceMemo** — see §5 (three modes).
- **embeddedFile** `{ fileId; name; mime; sizeBytes; previewKind: "image"|"pdf"|"video"|"none";
  allowDownload }` — any SlateDrop file; preview via the player; download gated by
  `folder_permissions`.

```ts
type Annotation = {               // SVG overlay → crisp in web AND PDF
  id: string;
  kind: "arrow" | "rect" | "circle" | "label" | "measurement";
  x: number; y: number; w?: number; h?: number;   // normalized 0–1
  text?: string; color?: string; index?: number;  // numbered callouts ①②③
};
```

## 4. Render modes (same blocks)

| Mode | Behavior | Generalizes |
|---|---|---|
| **vertical, 1-col** | top-to-bottom scroll, single column | `SharedDeliverableDocument` |
| **vertical, 2-col** | masonry two-column; `fullBleed`/`column:"full"` span both | new |
| **horizontal** | one block (or small group) per slide; swipe/arrow/keys; full-bleed media | `DeliverableSlideshow` |

`allowLayoutToggle` shows a viewer control to switch. Media embeds, before/after, and voice memos
behave identically in both modes (the chrome differs, the block doesn't).

## 5. Voice-memo block (three modes — CEO requirement)

```ts
type VoiceMemoBlock = Block & {
  type: "voiceMemo";
  audioFileId: string;
  url: string;
  durationMs: number;
  transcript?: { status: "none"|"queued"|"ready"|"failed"; text?: string };     // verbatim (Whisper)
  enhanced?:   { status: "none"|"queued"|"ready"|"failed"; text?: string; style: "report" }; // AI-polished prose
  displayMode: "audio" | "audio+transcript" | "audio+enhanced" | "enhanced+audio";
};
```

Lifecycle & token cost:
1. **Raw** — record `.m4a` → upload → play. No AI cost.
2. **Transcribe** — Modal **Whisper** → verbatim `transcript` (token cost: transcription).
3. **Enhance** — LLM rewrites the transcript into **cohesive, grammatically-correct, report-format
   prose** → `enhanced.text` (token cost: transcription + enhancement).

The author picks `displayMode` per memo and can regenerate. PDF prints the chosen text
(transcript/enhanced) + "audio available in the online version" + QR; web shows the player too.

## 6. Outputs (same blocks → three deliverables)

| Output | Engine | Interactive media | Voice memo | Files |
|---|---|---|---|---|
| **Web link** | React renderer (vertical/horizontal) | live `SlatePlayer` | player + text | preview + (gated) download |
| **PDF** | Puppeteer in Trigger/Modal | poster + QR/link | chosen text + QR | listed + link |
| **Email / SMS** | Resend / Twilio | link | — | — |

PDF rules: light/print theme, project branding, `printBackground`, `@page` margins, running
header/footer (page x/y), `break-inside: avoid` on media/pairs, annotations as embedded SVG.

## 7. Comments (two-way, report-level for v1)

```ts
type Comment = {
  id: string;
  reportId: string;
  authorKind: "internal" | "external";   // external = stakeholder via share token
  authorRef: string;                      // userId or token-bound identity (name/email)
  body: string;
  parentId?: string;                      // single-level replies
  createdAt: string;
};
```

A new comment fires the notification service (`report.comment`) → owner (in-app + email/push);
owner replies → external party emailed. Per-block comments are a later phase (anchor via
`Block.anchorId`).

## 8. Token-cost touchpoints (for the metering layer)

Charge tokens: Whisper transcription, AI enhancement, PDF render, any heavy media processing
behind a `mediaEmbed`. Free: viewing, text/photo blocks, raw audio playback, web link.

## 9. Open items before build

- Persist as `reports.report_json` (jsonb snapshot) vs normalized block tables — **lean: jsonb
  snapshot** for the shared report + a `report_comments` table for the live thread.
- Confirm horizontal mode groups (one block per slide vs allow a heading+photo pair per slide).
- Editor UX (drag-reorder blocks, set layout, per-memo mode) — separate editor spec.
