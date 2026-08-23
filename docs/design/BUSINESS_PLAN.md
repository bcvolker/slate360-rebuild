# Slate360 — Business Plan (draft, 2026-08-22)

**Model:** Brian performs on-site capture. Slate360 produces digital twins for contractors.
Each contractor gets a portal where they manage projects and re-share deliverables with
their own clients.

Numbers marked **measured** come from real jobs on this pipeline. Numbers marked *assumed*
are estimates that need validation against actual customers — pricing especially. Market
size, local competition, runway and existing relationships are inputs only Brian has.

---

## 1. What the business actually is

Two revenue lines that reinforce each other:

1. **A capture service.** Brian visits a site and produces a measurable, walkable digital
   twin. Sold per visit.
2. **A delivery platform.** The contractor keeps a portal: every scan of their job over time,
   documents pinned in place, measurements they can export, and the ability to share a
   controlled view with an owner or architect. Sold as a subscription.

The service earns today. **The platform is what makes it a business rather than a job** — it
creates recurring revenue, switching costs, and a reason the contractor calls again next
month instead of treating the scan as a one-off.

### The core insight to build on

A twin of a finished space is a nice-to-have. **A twin of a space about to be covered up is
evidence.** The moment before drywall goes on is the moment the scan is worth paying for, and
it recurs on every job, on every floor, on every phase.

That is the wedge: *"scan it before you cover it."*

---

## 2. What a contractor buys

| deliverable | what it is | why they care |
|---|---|---|
| **Walkable twin** | Matterport-style walk-through, station to station | Send a super to site without going to site |
| **Dollhouse + floor plan** | Room seen from above, ceiling toggled | Orientation, coordination, layout |
| **Plenum view** | Ceiling ghosted, duct/tray/sprinkler visible | **The MEP view competitors do not have** |
| **Measurements & take-off** | Floor area, net wall area minus openings, heights, exportable | An estimator's afternoon |
| **Document pinning** | RFIs, submittals, invoices, POs, thermal images pinned in place | Filing cabinet with a map |
| **Progression / history** | Every visit kept, compare dates side by side | Disputes, claims, "was that there in March?" |
| **Client portal + reshare** | Contractor shows the owner a controlled view | They look sophisticated to *their* client |

Everything above except 360 fusion is built and validated on a real capture today.

---

## 3. Pricing — a proposed structure to test

*All figures assumed and need validation.*

### Per-visit capture

| tier | scope | price |
|---|---|---|
| **Spot scan** | One room / one area, in and out | $350–500 |
| **Standard** | Residential floor or small commercial suite, ~2,000 sq ft | $750–1,200 |
| **Large** | Full building, multi-floor, multi-zone | $1,500–3,500 |
| **Progression retainer** | Scheduled monthly visits on an active job | $600–900/visit, billed monthly |

Price on **value and the site visit**, never on square footage alone — a 500 sq ft mechanical
room before ceiling close-in is worth more than 3,000 sq ft of empty warehouse.

### Portal subscription

| tier | includes | price |
|---|---|---|
| **Project** | One job, 12 months hosting, unlimited reshare | $49/mo or bundled into the scan |
| **Contractor** | Unlimited jobs, team seats, document pinning, take-off export | $199–399/mo |
| **Enterprise** | White-label, SSO, API | custom |

The subscription is the point. A contractor with three active jobs in the portal does not
leave.

### Add-ons

Exterior/drone pass, thermal survey (Brian is ITC Level III certified — a genuine
differentiator most capture operators cannot offer), rush turnaround, as-built comparison
against permitted drawings.

---

## 4. Unit economics — **measured**

| item | cost |
|---|---|
| Mesh + dollhouse + floor plan + take-off | **$0.05–0.15** (CPU, 3–6 min) |
| Photoreal walkthrough, one room | **$0.60–2.50** (GPU, 19–68 min) |
| Large multi-zone site | $2–8 |
| Storage, per project per year | single-digit dollars (R2 ~$0.015/GB-mo) |

**Compute is a rounding error — well under 1% of revenue.** A $900 scan costs a few dollars
to process.

This has a strategic consequence: **there is no cost reason to limit re-processing,
re-scanning, or keeping history forever.** Competitors who price per-scan-stored are
protecting a cost structure Slate360 does not have. Generosity with storage and history is
free margin and a real differentiator.

### The actual constraint

**Brian's time.** One operator, one van, one day at a time.

| | *assumed* |
|---|---|
| Door-to-door, standard job | 2–3 hours |
| Large job | half to full day |
| Processing | unattended |
| QC + publish | 30–60 min |
| Realistic throughput | **1–2 jobs/day, 15–20 scan-days/month** |

Everything strategic follows from that: the business is capacity-constrained, not
cost-constrained.

---

## 5. Revenue model

*Illustrative, assumed pricing, assumed uptake.*

**Year one, solo, ramping:**

| | month 3 | month 6 | month 12 |
|---|---|---|---|
| Scans/month | 6 | 14 | 20 |
| Avg scan price | $700 | $800 | $850 |
| Scan revenue | $4,200 | $11,200 | $17,000 |
| Portal subscribers | 3 | 10 | 22 |
| Subscription revenue | $600 | $2,000 | $4,400 |
| **Monthly total** | **$4,800** | **$13,200** | **$21,400** |

That approaches **~$200–250k/year run-rate as a solo operator** — with compute costs under
$300/year and the platform already built.

### Where the ceiling is, and the three ways past it

Capacity caps this near $250k. The paths beyond:

1. **Train and equip other scanners.** The kit is cheap (phone, 360 camera, pole, printed
   tags — not a $50k rig), the SOP is written, and the pipeline is unattended. This is the
   most natural path and the reason the SOP document matters commercially, not just
   technically.
2. **Licence the platform to other capture operators.** Highest leverage, but it inverts the
   positioning — see §8.
3. **Raise price by specialising.** Pre-cover MEP documentation, thermal + twin combined,
   as-built vs permitted comparison. Fewer jobs, higher value, less windshield time.

Path 1 is the recommended first move. Path 2 is a later decision, not a near-term one.

---

## 6. Customer

**Primary: general contractors and construction managers** on projects where something gets
covered up and someone will later argue about it.

Buying triggers, in rough order of strength:
1. About to close a ceiling or wall
2. A dispute or claim in progress
3. An owner demanding better documentation
4. Renovation work in an existing building with no reliable as-builts
5. Handover / O&M requirements

**Secondary:** architects (existing-conditions), facility managers (as-builts), insurance and
restoration (before/after), real estate (the least valuable and most crowded — do not lead
with it).

**Why they buy from a person rather than buying a camera:** they do not want to own hardware,
train staff, or process anything. They want to make a phone call and get a link.

---

## 7. Competitive position

| | Matterport | Multivista | **Slate360** |
|---|---|---|---|
| Walkable twin | strong | weak | strong |
| Measurement | weak, tape-like | none | **net take-off, exportable** |
| Time/progression | weak | **strong** | **strong** |
| Document pinning | weak | strong | **strong, survives re-scan** |
| Plenum / above-ceiling | **absent** | photos only | **present** |
| Interior + exterior one site | weak | weak | designed for it |
| Thermal | absent | absent | **ITC Level III certified** |
| Accuracy honesty | implies precision | n/a | **labelled per surface** |

The gap nobody occupies: **an evidentiary, measurable, time-aware twin with a filing
cabinet.** Matterport has the walk without the evidence. Multivista has the evidence without
the walk.

Two things are genuinely defensible: the **thermal certification** (a credential, not
software) and **accuracy honesty** — every measurement labelled verified or estimated, every
unscanned surface visibly grey. Competitors imply a precision they do not have; being the one
who states it plainly is a durable position with professionals.

---

## 8. Positioning and the method

**Client-facing material describes outcomes and accuracy. Never equipment.** No device names
in any deliverable, share page, PDF, or on the site. The QC card says what the accuracy *is* —
verified/estimated, the residual, that a laser governs. It never says what produced it.

This is both commercial protection and good practice: the number is the claim, the kit is an
implementation detail. It also keeps the door open — if the pipeline later runs on better
sensors, nothing client-facing has to change.

**The tension to name now:** the value is in doing what a $50k rig does with inexpensive
equipment. Licensing the platform to other operators (§5, path 2) requires revealing exactly
that. Those two strategies are in direct conflict, and choosing between them is a decision to
make deliberately later — not to drift into.

---

## 9. Operating workflow

**On site** — scan per the SOP: LiDAR walk for geometry, 360 at two heights for texture,
printed tags if the site is bare drywall, one GPS fix at the door.
**Back at the office** — upload the phone capture, drag in 360 and drone files, mark ready.
**Unattended** — the pipeline runs. Measurable deliverable in minutes, photoreal overnight.
**QC** — check coverage ratio, storey height against a standard, fusion residual, untextured
fraction. **A failing scan is re-shot, never shipped.**
**Publish** — into the contractor's portal. They compose a share package for their client.

The gates matter commercially, not just technically: shipping one confidently-wrong
measurement to a contractor who bids off it costs more than any scan earns.

---

## 10. Risks

| risk | severity | mitigation |
|---|---|---|
| **Liability from a bad measurement** | **highest** | Estimating-grade language everywhere, per-surface labelling, laser governs, never an EoR claim. Carry insurance. |
| Capacity ceiling | high | §5 paths; do not accept work that cannot be serviced |
| Matterport adds take-off | medium | They have not in a decade; thermal and evidentiary depth remain |
| A contractor buys a camera instead | medium | They do not want to process or train; sell the service, not the tech |
| 360 fusion never fully automates | **low impact** | Already demoted — the twin ships without it; printed tags are the fallback |
| Solo dependency | high | Everything in one person. Document the SOP (done), then train a second operator |
| Price resistance | medium | Lead with pre-cover evidence, not "3D tour" — different budget line |

---

## 11. Milestones

**Now → 4 weeks.** Re-scan on the new build. Finish the viewer (ceiling states done, crop and
polish next). Project-first capture app. **One paid pilot job at real price.**

**1–3 months.** Portal and share packages. Three to five paying contractors. Progression
proven — the same job scanned twice with a working date comparison.

**3–6 months.** 360 fusion or printed-tag fallback in production. Exterior pass. First
retainer client. Decide on operator #2.

**6–12 months.** 15–20 scans/month. 20+ portal subscribers. As-built vs permitted comparison
as the premium offer.

---

## 12. What is unknown and needs real data

Stated plainly rather than assumed away:

1. **Price tolerance.** Every figure in §3 is a guess until a contractor pays one.
2. **Sales cycle.** Unknown. Construction can be slow and relationship-driven.
3. **True throughput.** 1–2 jobs/day is untested including drive time and QC.
4. **Repeat rate.** The whole model assumes progression scanning recurs. Unproven.
5. **Local market.** No data on how many active jobs are within a serviceable radius.
6. **Whether contractors value the portal or just want a link.** If the latter, subscription
   revenue is weaker than modelled and the plan tilts back toward pure services.

Item 6 is the one worth testing earliest — it decides whether this is a services business
with software attached, or a software business with services attached. **The first three
customers will answer it.**
