# Twin 360 deliverables — what to sell first, and what the tech honestly supports

**Status:** working note, 2026-09-06. Written for Brian and for the agents on the other
machines (Grok desktop, Cursor). Reconciles Brian's target list (dollhouse / plan / multi-floor,
X4 360, exterior 360 drone, Mavic 3E RTK, DroneDeploy imperfections) with what the repo and the
data actually show today.

## 1. The measured truth so far (from production `digital_twin_models`)

| Same-room comparison | Cameras | Iterations | Train PSNR |
|---|---|---|---|
| Kitchen, iPhone + LiDAR (22 Aug) | 94 | 19,500 | **32.65** |
| Kitchen, 360 walking video (22 Aug) | 574 | 19,500 | **20.38** |
| AOB205, 20 stationary 360 stills | 268 | 45,000 | **29.68** |
| AOB205, 360 walking video | 573 | 19,500 | **20.97** |

Two conclusions Brian can act on now:
1. **Stationary capture beats walking video** by a large margin on the identical scene. For the
   client-facing twin, shoot slow, stop often, or use stills — and let the walking video be the
   *walkthrough* deliverable, not the splat source.
2. **iPhone + LiDAR is the current hero recipe** for interiors (also the only one that ships a
   scale). This is what the visit model in `TWIN360_VISIT_IA.md` is built to file.

`trainPsnr` rewards overfitting and is not comparable across scenes. Before the desktop program
ranks methods, record held-out PSNR/SSIM and camera count on every run, and hold iterations and
quality tier constant when comparing.

## 2. Dollhouse, plan view, multiple floors

These are **viewer + data-model** features, not capture features, and they are close.

- **Dollhouse / overview / top** already exist as modes in the client twin chrome
  (`TwinExperience`: Walk · Orbit · Fly · Overview · Top). Overview = recenter; Top = orbit pose
  from above. A true plan-like cut needs a ceiling clip plane — the splat viewer core can add a
  clip on Y; that is a small renderer change, not research.
- **Multiple floors:** do not build one giant multi-storey splat. One **space per level**
  (`digital_twin_spaces`: "Level 1", "Level 2"), each with its own visits and models, and a level
  selector in the viewer that swaps models. This is what the visit IA already supports and what
  Matterport effectively does behind its floor switcher.
- **Rooms / navigation:** the plan overlay and station pins are already the room index. Twin →
  station → walkthrough deep links exist in the client experience (`hrefForRef`).

## 3. Exterior: 360 drone, Mavic 3E RTK, DroneDeploy

- **Gaussian splats vs DroneDeploy meshes:** splats will look far better than the melted
  photogrammetry meshes Brian is seeing — that is exactly what they are good at. They will **not**
  replace the measurable products: orthomosaic, volumes, contours. Keep photogrammetry for
  anything with a number on it; use the splat for the visual model. Same capture, two outputs.
- **RTK (Mavic 3E):** its value is georeferencing and scale for the *whole* exterior model, which
  neither the current worker nor the splat trainer consumes yet (`georef {}` on every model,
  no RTK handling in code). Wire EXIF RTK tags → scale/orientation prior first; that single step
  makes exterior splats site-aligned and lets interior LiDAR twins be placed on the site.
- **360 drone** (Antigravity A1): treat as *stationary 360 stations in the air* — the same
  stations product, pinned to the site plan — not as a splat source until the 360 → splat path
  is proven on the ground (§1).
- **Ground-level exterior 360 walks:** same rule as interiors — stop-and-shoot beats walking for
  the splat; the walk is the tour.

## 4. Federation, not fusion

Interior and exterior stay separate models linked by pins (locked in the studio plan and the
business context). A GC sees one project with an exterior orbit and interior walks; nobody has
to wait for a fused model that does not exist yet.

## 5. LiDAR range and hardware

iPhone LiDAR (~5 m) is fine for rooms and corridors and is the only current source of scale.
Longer-range LiDAR (rental TLS / mobile mapper) is a **partner or rental line item** on the first
job that needs it, not a purchase. The business does not need to compete on hardware to sell
dated, branded, spatially indexed documentation — that is a software and process advantage.

## 6. What this means for the next three weeks

1. Ship the TestFlight build with named visits; walk AOB205 as Project → "Room 205" → dated
   visit, iPhone + LiDAR, slow and stationary-heavy.
2. Desktop trains it; the output is filed as a model version with an honest `qaStatus`.
3. Client portal (V3 components, already on the branch) shows the twin only when accepted.
4. Sell the walkthrough + stations + portal now; add the twin to the same portal the day one
   passes the gate.
