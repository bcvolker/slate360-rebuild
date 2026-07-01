# Twin 360 Processing Screen — Staged Progress + Trustworthy Wait + Completion Payoff

**Status:** Design specification for production implementation  
**Context:** Modal GPU reconstruction (Gaussian Splat via COLMAP → splatfacto) takes 20–40 minutes. Current screen freezes at 5%. Adding stage callbacks from worker.

---

## 1. Core UX Principles

### Why Staged Checklist > Percentage Bar

| Approach | Problem | Solution |
|----------|---------|----------|
| **Percentage** | Stuck at 5% for 30 min feels broken | **Staged checklist** shows movement through 5 discrete states |
| **"Processing..."** | No visibility into what's happening | **Named stages** with context-appropriate expectations |
| **Linear progress** | Reality is bursty (COLMAP fast, training slow) | **Stage-based** captures actual workflow |
| **Forced precision** | Fake 47% → 48% after 10 min erodes trust | **Honest uncertainty** with time ranges per stage |

### The Trust Equation

Users feel abandoned when:
- They don't know if progress is happening
- They can't leave without losing work
- There's no confirmation channel when done

We build trust by:
- **Visible progress** (stage transitions)
- **Explicit permission** ("You can close this — we'll notify you")
- **Reliable notification** (push + email on completion)
- **Persistent state** (reopen anytime to check status)

---

## 2. The Five Stages

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE          │ TYPICAL TIME  │ USER MENTAL MODEL        │ COPY ANCHOR           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Upload      │ 30 sec–2 min  │ "Getting my scan"        │ Files → Cloud         │
│ 2. Align       │ 2–5 min       │ "Matching my frames"       │ COLMAP registration  │
│ 3. Train       │ 15–30 min     │ "Building the 3D model"    │ Neural reconstruction │
│ 4. Mesh        │ 3–8 min       │ "Adding surface detail"    │ Geometry extraction   │
│ 5. Export      │ 1–2 min       │ "Wrapping up"              │ File packaging       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Implementation note:** Each stage emits from Modal worker via Trigger.dev callback:
```typescript
type Stage = 'upload' | 'align' | 'train' | 'mesh' | 'export';
interface StageUpdate {
  capture_id: string;
  stage: Stage;
  status: 'started' | 'completed' | 'failed';
  stage_progress?: number; // 0-100 within stage (optional, coarse)
  estimated_remaining_seconds?: number; // rough guidance
  message?: string; // human-readable context
}
```

---

## 3. Screen Layout: Three Modes

### Mode A: Active Processing (Primary View)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ← Back                    Processing                           [?] Help           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │                        [LARGE ILLUSTRATION]                                 │  │
│  │                                                                             │  │
│  │                    ┌─────────────────────┐                                  │  │
│  │                    │   Visual metaphor   │                                  │  │
│  │                    │   for current stage │                                  │  │
│  │                    └─────────────────────┘                                  │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  PROCESSING YOUR SCAN                                                        11:42 │
│  Started 3 minutes ago                                                              │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ ● Uploading to cloud                      ────────────  0:32  ✓           │  │
│  │ ● Aligning frames (COLMAP)                ▓▓▓▓▓░░░░░  2:15  ✓           │  │
│  │ ○ Training neural model                   ░░░░░░░░░░░░  ~25m     ← ACTIVE │  │
│  │ ○ Extracting mesh geometry                ─────────────────────────────   │  │
│  │ ○ Finalizing export                       ─────────────────────────────   │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  STAGE DETAIL                                                               │  │
│  │                                                                             │  │
│  │  Converting 247 LiDAR + RGB frames into a 3D point cloud. This stage       │  │
│  │  trains a neural radiance field to represent your space volumetrically.    │  │
│  │                                                                             │  │
│  │  [Lightbulb icon] Tip: Good coverage shows walls, floors, and ceiling.    │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  [Bell icon]  We'll notify you when complete                                │  │
│  │                                                                             │  │
│  │  You can close this screen or turn off your phone. Reopen anytime via       │  │
│  │  Projects → Oak Ridge → Twins.                                            │  │
│  │                                                                             │  │
│  │  [Learn more about processing]                                              │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│                    [Cancel processing]   [Dismiss — check later]                    │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

1. **Large stage visualization** — Abstract illustration (not literal) showing the concept:
   - Upload: Files floating upward into cloud
   - Align: Frames snapping into grid alignment  
   - Train: Neural nodes lighting up
   - Mesh: Wireframe solidifying
   - Export: Package sealing

2. **Staged list (not percentage bar)** — Checkmarks for complete, pulse for active, dots for pending
   - Time shown per stage (actual elapsed or rough estimate)
   - Progress bar WITHIN stage only (if data available), not across whole job

3. **Stage detail card** — Educational context for what's happening:
   - One-sentence plain English explanation
   - Pro tip relevant to stage (coverage, lighting, etc.)
   - Changes as stage advances

4. **Trust banner** — Reassurance you can leave:
   - Push notification icon + confirmation
   - Explicit "you can close" permission
   - Re-entry path (Projects → [Project] → Twins)

5. **Actions** — Appropriate to state:
   - Cancel (destructive, confirms cost/credit loss)
   - Dismiss (keeps processing, returns to project)

### Mode B: Background/Notification State

When user returns via push notification or reopens app:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  TWIN 360 STUDIO                                            [Processing badge]      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  Oak Ridge — North Wing                                                             │
│  Submitted June 30, 11:38 AM                                                        │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  [Thumbnail placeholder]                                                    │  │
│  │                                                                             │  │
│  │                    Processing in background                                 │  │
│  │                                                                             │  │
│  │                    Stage 3 of 5 — Training                                  │  │
│  │                    Estimated: 18 minutes remaining                            │  │
│  │                                                                             │  │
│  │  [  STAGELIST EXPANDED  ]                                                   │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  [View other twins]     [Check status — opens full processing screen]             │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Mode C: Completion Payoff (The Reward)

Screen transforms to celebrate and surface the result:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ← Back                    Complete                                 [Share] [⋮]       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│                              [CELEBRATION MICRO-ANIMATION]                         │
│                                                                                     │
│                                   ✓ Complete                                       │
│                                                                                     │
│                           ┌─────────────────────┐                                  │
│                           │                     │                                  │
│                           │    [3D PREVIEW]     │  ← Wireframe or low-res splat   │
│                           │    thumbnail        │     rotates slowly              │
│                           │                     │                                  │
│                           └─────────────────────┘                                  │
│                                                                                     │
│                        Oak Ridge — North Wing                                       │
│                        Gaussian splat · 94 MB · 2.3M points                         │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                             │  │
│  │  WHAT YOU CAN DO NOW                                                        │  │
│  │                                                                             │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐            │  │
│  │  │   [Eye]    │  │ [Crop/Edit]│  │ [Measure]  │  │  [Share]   │            │  │
│  │  │   View     │  │    Edit    │  │  Measure   │  │   Share    │            │  │
│  │  │  in 3D     │  │   splat    │  │   space    │  │  deliverable│           │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘            │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  NEXT STEPS                                                                 │  │
│  │                                                                             │  │
│  │  ▸ Compare with previous capture (if exists)                                │  │
│  │  ▸ Add to deliverable for client review                                     │  │
│  │  ▸ Schedule follow-up capture                                               │  │
│  │  ▸ Export for CAD/BIM import                                                │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│                       [↑ Back to project]     [Capture another →]                  │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Payoff design principles:**

1. **Celebration moment** — Subtle animation (checkmark draws, preview fades in)
2. **Immediate preview** — Not just text, but actual rotating thumbnail of the splat
3. **Four primary actions** — Grid of large touch targets (48px+) for next steps
4. **Secondary actions** — Contextual suggestions based on project state
5. **No dead ends** — Every path leads forward (view, edit, share, or capture more)

---

## 4. Stage Visual System

### Stage Icons (48×48px touch targets)

```tsx
const stageConfig: Record<Stage, {
  icon: LucideIcon;
  label: string;
  description: string;
  tip: string;
  illustration: 'upload' | 'align' | 'train' | 'mesh' | 'export';
  timeRange: string;
}> = {
  upload: {
    icon: CloudUpload,
    label: 'Uploading to cloud',
    description: 'Securely transferring your capture files to Slate360 servers.',
    tip: 'Wi-Fi recommended for faster upload.',
    illustration: 'upload',
    timeRange: '30 sec–2 min'
  },
  align: {
    icon: Grid3x3,
    label: 'Aligning frames',
    description: 'Using COLMAP to find camera positions and create initial point cloud.',
    tip: 'Good overlap between frames helps accuracy.',
    illustration: 'align',
    timeRange: '2–5 min'
  },
  train: {
    icon: BrainCircuit,
    label: 'Training neural model',
    description: 'Teaching AI to represent your space volumetrically via Gaussian Splatting.',
    tip: 'Longer training = higher quality. Large spaces take more time.',
    illustration: 'train',
    timeRange: '15–30 min'
  },
  mesh: {
    icon: Box,
    label: 'Extracting mesh geometry',
    description: 'Converting splat representation into solid 3D mesh surfaces.',
    tip: 'Useful for CAD import and measurement accuracy.',
    illustration: 'mesh',
    timeRange: '3–8 min'
  },
  export: {
    icon: Package,
    label: 'Finalizing export',
    description: 'Packaging splat, mesh, and metadata into deliverable formats.',
    tip: 'Files available in .spz, .ply, and .obj formats.',
    illustration: 'export',
    timeRange: '1–2 min'
  }
};
```

### Stage States (Visual)

```
Complete:    ● Stage name  ────────  0:32  ✓  (muted, strikethrough optional)
Active:      ○ Stage name  ▓▓▓▓░░░  2:15     (blue accent, subtle pulse)
Pending:     ○ Stage name  ────────  ───      (muted, no time)
Failed:      ✕ Stage name  ────────  Failed   (red, with retry action)
```

### Active Stage Accent Usage (One Blue, As Per Constraint)

```css
/* Only the active stage uses the blue accent */
.stage-active {
  border-left: 2px solid var(--twin360-blue);
  background: color-mix(in srgb, var(--twin360-blue) 5%, transparent);
}

.stage-active-icon {
  color: var(--twin360-blue);
  /* Subtle pulse animation, no glow */
  animation: pulse-subtle 2s ease-in-out infinite;
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Complete stages are muted */
.stage-complete {
  opacity: 0.5;
}

/* Pending stages are dimmed */
.stage-pending {
  opacity: 0.3;
}
```

---

## 5. Typography + Copy System

### IBM Plex Mono Labels (Section Headers)

```tsx
// All-caps, tracked, muted
<label className="label-mono text-graphite-500">
  PROCESSING YOUR SCAN
</label>
```

### Time Display

```tsx
// Human readable, not seconds
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// Estimated ranges use ~ prefix
<span className="text-graphite-400">~25m remaining</span>
```

### Copy Tone

| Element | Tone | Example |
|---------|------|---------|
| **Stage labels** | Technical but accessible | "Aligning frames (COLMAP)" not "Structure from Motion" |
| **Descriptions** | Plain English | "Teaching AI to represent your space" not "Optimizing 3D Gaussian parameters" |
| **Tips** | Helpful, non-judgmental | "Good overlap helps" not "Your coverage was poor" |
| **Trust messaging** | Confident, permission-giving | "You can close this" not "Don't close this" |
| **Completion** | Celebratory but professional | "Complete" not "Boom! Done!" |

---

## 6. Implementation Architecture

### Database Schema Additions

```sql
-- Add stage tracking to existing twin_jobs table
ALTER TABLE twin_jobs ADD COLUMN IF NOT EXISTS 
  current_stage VARCHAR(20) CHECK (current_stage IN (
    'upload', 'align', 'train', 'mesh', 'export'
  ));

-- Stage history log (for debugging, analytics)
CREATE TABLE twin_job_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES twin_jobs(id),
    stage VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    progress_pct INTEGER CHECK (progress_pct BETWEEN 0 AND 100),
    estimated_remaining_seconds INTEGER,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_twin_job_stages_job ON twin_job_stages(job_id, created_at DESC);

-- Notification preferences for completion
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS 
  twin_processing_complete_enabled BOOLEAN DEFAULT true;
```

### Modal Worker Callbacks

```python
# In workers/modal/thermal-analysis/worker.py (or twin-specific worker)
# Emit stage updates via Trigger.dev callback

async def emit_stage(job_id: str, stage: Stage, status: StageStatus, **kwargs):
    await trigger_client.send_event(
        "twin.stage_update",
        {
            "job_id": job_id,
            "stage": stage,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            **kwargs
        }
    )

# Usage in pipeline:
await emit_stage(job_id, "upload", "started")
# ... upload files ...
await emit_stage(job_id, "upload", "completed", elapsed_seconds=45)

await emit_stage(job_id, "align", "started")
# ... COLMAP ...
await emit_stage(job_id, "align", "completed", elapsed_seconds=180)

await emit_stage(job_id, "train", "started", estimated_remaining_seconds=1800)
# ... splatfacto training with periodic progress ...
await emit_stage(
    job_id, 
    "train", 
    "progress",  # intermediate update
    progress_pct=34,
    estimated_remaining_seconds=1200
)
# ... complete ...
await emit_stage(job_id, "train", "completed")
```

### React Component Structure

```tsx
// app/(dashboard)/digital-twin/processing/[captureId]/page.tsx
export default function TwinProcessingPage({ 
  params: { captureId } 
}: { params: { captureId: string } }) {
  return (
    <TwinProcessingShell captureId={captureId}>
      <TwinProcessingStages />
      <TwinProcessingTrustBanner />
      <TwinProcessingActions />
    </TwinProcessingShell>
  );
}

// components/digital-twin/processing/TwinProcessingStages.tsx
// Staged checklist with current stage highlighting

// components/digital-twin/processing/TwinStageIllustration.tsx
// SVG/animation for current stage visual

// components/digital-twin/processing/TwinProcessingTrustBanner.tsx
// "We'll notify you" + reassurance copy

// components/digital-twin/processing/TwinProcessingCompletion.tsx
// Mode C: Payoff screen with preview + actions

// hooks/useTwinJobStages.ts
// Realtime subscription to stage updates
```

---

## 7. Edge Cases

### Slow/No Progress

After 5 minutes in one stage without update:
- Show "Still working..." subtext
- Do NOT show fake progress
- Offer "Check system status" link to status page

### Background + Return

- Resume shows current stage immediately
- No "catch up" animation needed
- Time displays show total elapsed, not per-session

### Cancellation

```
Confirm cancellation?

Your scan will stop processing. You will NOT be charged 
for incomplete processing.

[Keep processing]  [Yes, cancel]
```

### Failure

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Processing stopped                                    │
│                                                          │
│  Stage: Training neural model                            │
│  Reason: Insufficient camera movement for reconstruction│
│                                                          │
│  [View troubleshooting guide]  [Retry from Align]        │
│  [Contact support]           [Start new capture]           │
└──────────────────────────────────────────────────────────┘
```

### Multiple Concurrent Jobs

Show list view:
```
Processing (2)

Oak Ridge — Training stage    ~18m left    [View →]
Riverfront — Uploading        ~1m left     [View →]
```

---

## 8. Accessibility

- **Screen readers:** Announce stage changes with `aria-live="polite"`
- **Reduced motion:** Disable pulse animation, instant state changes
- **Color independence:** Icons + labels, not color alone
- **Touch targets:** 48px+ for all actions
- **Contrast:** All text meets WCAG AA on dark canvas

---

## 9. Analytics

Track to optimize:
- Time spent on processing screen (before dismiss)
- Dismissal rate by stage
- Re-entry rate (notification effectiveness)
- Completion → view conversion
- Stage-specific failure rates

---

## 10. Design Token Compliance

| Token | Value | Usage |
|-------|-------|-------|
| `--graphite-canvas` | `#0B0F15` | Background |
| `--twin360-blue` | `#3D8EFF` | Active stage ONLY |
| `--graphite-muted` | `#A3AED0` | Labels, complete stages |
| `--graphite-text-header` | `#FFFFFF` | Primary text |
| `--graphite-text-body` | `#F8FAFC` | Descriptions |
| `--danger` | `red-400` | Failures |
| `--success` | `emerald-400` | Completion checkmark |

**Enforcement:**
- Zero amber/orange usage
- No glow effects
- No rounded-full buttons (use rounded-xl)
- IBM Plex Mono for all labels

---

*Design locked: June 30, 2026*
