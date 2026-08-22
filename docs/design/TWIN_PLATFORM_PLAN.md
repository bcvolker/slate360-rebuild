# Twin Platform Plan — capture app, viewer, portal, economics

The plan of record above the pipeline. Covers what Brian actually operates: an app he
uses on site, a viewer his clients live in, and the unit economics that set his pricing.

Pipeline internals stay in `INTERIOR_TWIN_BUILD_PLAN.md` and
`SENSOR_FUSION_ARCHITECTURE_LOCKED.md`.

---

## 1. Every sensor is used. This was always the intent.

Stated plainly because it drifted: **iPhone LiDAR *and* iPhone video *and* 360 video at
two heights all feed the model.** They are not alternatives.

| source | contributes | status |
|---|---|---|
| iPhone LiDAR depth | **geometry** — the metric mesh, the authority | working, validated |
| iPhone stills (one per depth keyframe) | texture | working — 115,308 vertices |
| **iPhone video frames between keyframes** | **more texture views, no re-scan needed** | **not yet used — next** |
| 360 high pass | texture on upper walls and ceiling | unwrap done, alignment open |
| 360 low pass | texture under cabinets, low detail | blocked on operator masking |

The iPhone video is the cheapest unclaimed win: it was recorded at full rate while depth was
throttled to 2 Hz, so those frames already exist for every capture ever taken. Poses
interpolate between keyframes. It improves texture on captures already in the bucket.

---

## 2. The capture app: project-first, not a scan list

Brian's words: *"after I do a scan I see a list of previous scans and I have no idea what
they are."* The capture screen is good. Everything after it is noise.

**The rule: a scan always belongs to a project.** Never a free-floating file.

- **Quick scan stays quick.** Hit record, walk, stop. No forms first — that is what makes it
  usable on site.
- **Prompt for a home immediately after saving**, while the operator still remembers what
  they scanned: *"Add to a project?"* → recent projects, or create one. Two taps.
- An unfiled scan goes to **Unfiled**, which is a small badge, not the main screen. It does
  not accumulate silently into the mess described above.
- **The scan list is scoped to the active project.** Last week's quick walks of another
  building are not visible while working today.
- Within a project, scans group by **area / floor / date** — the same vocabulary the viewer
  uses, so what he files on site is what he finds at his desk.

### The handoff to the desk — the missing half

Today the phone holds files with no route to the website. Needed:

- Each project shows a **manifest of what the phone captured**: clips, depth, poses,
  photos, with sizes and upload state.
- Desktop shows **the same project with the same manifest**, and a drop zone: drag in the
  360 `.insv` files, drone footage, plans, anything shot off-device.
- Explicit **"Ready to process"** — the operator says when the set is complete, rather than
  the pipeline guessing.
- Upload is resumable and survives the drive home. (Resumable uploader already shipped.)

---

## 3. The client viewer

Adopted from the external product memo, which is well-judged. Structure is
**Site → Date → Realm → Level → Mode** — four controls, always in the same place, never one
mega-dropdown.

| control | what it answers | notes |
|---|---|---|
| **Site** | which building | the job |
| **Date** | which visit | immutable captures; Latest default; milestones (`Rough-in`, `Covered`) are aliases |
| **Realm** | Interior / Exterior / Documents / Take-off | left tabs. Documents and Take-off work without opening 3D |
| **Level** | Ground / Level 2 / Basement / Roof | **stairs are a transition, not a floor** |
| **Mode** | Walk / Dollhouse / Floor plan (interior)<br>Orbit / Ground / Aerial / Ortho (exterior) | segmented control |

**Ceiling is a toggle, not a deleted mesh.** Three states, and the third is the one that
sells:
1. **Open** (default) — dollhouse, lid removed, plan readable.
2. **Closed** — full envelope, for soffits, finishes, leak staining.
3. **Plenum / above grid** — lid ghosted or lifted. Duct, tray, sprinkler, rough-in before it
   is buried. This is the MEP view Matterport's dollhouse hides.

Current code cuts the ceiling permanently in `mesh_dollhouse.cut_ceiling`. That has to become
a **layer flag on one mesh**, not a destroyed one — otherwise state 2 and 3 are impossible
and it is a rebuild.

**Capture sources are not navigation.** The viewer shows the site. Which sensor produced a
surface belongs in a QC panel, not a menu the client picks from.

### Pins and documents — the part that must not break

**A pin is anchored to the site, never to a triangle.** If a pin is a vertex ID, the next
scan deletes the client's filing cabinet. Anchor = level + room + a point in the site frame.

On re-scan: reproject within ~30 cm → keeps its home, marked auto-placed. If it does not
land, it stays in Documents flagged **needs a new home**, with the photo of where it was.
**Never delete on re-scan.**

Much of this already exists — attachment kinds (`document`, `image`, `panorama_360`,
`thermal`, `link`, `proposal`/`invoice`) and version history are built. RFIs, submittals and
POs are new *types* on that schema.

### Measurements

Snap to the collision mesh, never the splat. Every number carries capture date and a
verified/estimated label. **Frozen by default across dates** — a number used in a bid must
not silently change when a new scan lands; opt-in Live shows a delta instead.

Net wall area with an opening toggle, and the detected doors/windows listed so an estimator
can uncheck one the detector got wrong. That is the feature that owns an estimator's
afternoon, and the openings logic already exists.

### Sharing

A **share package**, never a naked link to the whole office: which dates, which realms, which
pin types, whether measuring is allowed, expiry, watermark. Owner sees Walk + Dollhouse +
the documents Brian chose.

---

## 4. Cost per scan — what this actually costs to run

Measured jobs, current pricing. **The mesh and measurement deliverable is CPU-only and
cheap; the photoreal splat is where GPU money goes.**

| deliverable | compute | measured time | rough cost |
|---|---|---|---|
| **Mesh + dollhouse + floor plan + take-off** | CPU | **3–6 min** | **~$0.05–0.15** |
| Photoreal splat, one room | GPU (A10/L4) | 19–68 min | ~$0.60–2.50 |
| Photoreal splat, large / multi-zone | GPU × N zones | 1–2 h per zone | ~$2–8 |

Storage and delivery are the recurring cost, not processing: R2 at roughly $0.015/GB-month,
with a capture running 1–3 GB of source plus a few hundred MB of deliverable. A project held
for a year is single-digit dollars.

**The commercially important number: a same-day measurable deliverable costs cents.** Even a
full photoreal twin of a house is a few dollars of compute. Pricing is set by the value of
the deliverable and the site visit, not by compute — which should be a rounding error in any
quote.

Caveat: these are current measured figures at current rates, on jobs of the size run so far.
A warehouse at 3,500 frames has not been run and the per-zone estimate is extrapolation.

---

## 5. Cheap equipment that measurably helps

Ranked by value per pound.

| kit | cost | what it buys |
|---|---|---|
| **Printed AprilTags on A4** | ~£0 | The drywall answer. Unmistakable to any camera, indifferent to featureless paint. Three per room makes 360 alignment and multi-room joins near-deterministic. Removed after the scan. |
| **A tape measure** | ~£10 | One measured wall per site is an independent accuracy check we currently cannot make. Not for measuring the job — for proving the model. |
| **Printed ground control markers, exterior** | ~£0 | Same trick outdoors. With one known coordinate they georeference the site without a survey. |
| **A monopole with a fixed, measured phone mount** | ~£40 | Co-mounting the phone and 360 turns fusion from a registration problem into an offset. The single biggest lever on 360 quality. |
| **Cheap GNSS / phone GPS fix at the door** | ~£0 | Pins the building on Earth to a few metres — enough to place it in a globe view, not enough to measure with. |
| **RTK drone** (owned) | — | Flown once per project: absolute frame + exterior geometry. Must remain optional; nothing depends on it. |

Notably **not** needed: a survey-grade scanner. The gap to a $50k rig is real on glass,
mirrors and long range — not on a kitchen.

---

## 6. Positioning — the method is not the product

Client-facing material describes **outcomes and accuracy**, never equipment. No device names,
no brand names, no "captured with a phone" in any deliverable, share page, or PDF.

The QC card says what the accuracy *is* — verified/estimated, the residual, what a laser
would govern. It does not say what produced it. That is both good positioning and good
practice: the number is the claim, the kit is an implementation detail.

Applies to: share viewer chrome, exported PDFs, the marketing site, and any AI assistant
in the portal.

---

## 7. Order of work

1. **iPhone video frames as texture views** — improves captures already in the bucket, no
   re-scan, no new capture code.
2. **Ceiling as a layer flag** rather than a destroyed mesh — cheap now, a rebuild later.
3. **Project-first capture app** — scans always belong somewhere; scan list scoped to the
   active project.
4. **Phone → desk manifest and drop zone** — the missing half of the workflow.
5. Session/zone graph and `site_frame` — expensive to retrofit.
6. 360 alignment, with AprilTags as the reliable path.
7. Portal, share packages, assistant.
