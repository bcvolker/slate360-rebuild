# L5: light client chrome on every client share surface

Captured 2026-09-30 at 375 / 768 / 1280 px with Chrome. The Directed Tour flag (`spatial_directed_tour`) stayed OFF before, during and after every run. Portal frames used placeholder project data and were removed because they displayed that internal title. Raw numbers per shot are in `measurements.txt`: canvas colour, horizontal overflow, nav scroll, dark blocks and banned words.

| Surface | Route | Shots | Notes |
|---|---|---|---|
| Portal overview | `/portal/<token>` | removed | Placeholder project, preview token. Frames removed with the internal title. |
| 360 / Walkthrough | `/portal/<token>/reality` | removed | |
| Documents | `/portal/<token>/documents` | removed | |
| Items | `/portal/<token>/items` | removed | Empty filter shows one short line |
| Item detail | `/portal/<token>/item/<id>` | removed | |
| Share dialog (operator) | Studio → Publish | `share-dialog-*` | The copy box shows `/portal/<token>`. The Studio itself stays Graphite (operator surface) |
| Site Walk deliverable | `/view/<token>` (and `/share/deliverable/<token>`, which redirects there) | `legacy-deliverable-viewer-*` | Mock harness `/preview/deliverable-viewer`. The live route writes chain-of-custody events, so it was not hit on prod |
| Deliverable slideshow | presentation mode inside the deliverable | `legacy-deliverable-slideshow-*` | Intentionally dark full-screen media mode. No Graphite tokens |
| Legacy claim token | `/portal/<legacy token>` | `legacy-claim-portal-*` | Was an empty dashboard. Now one honest line |
| File share | `/share/<token>` | `legacy-file-share-*` | The test file's R2 object is missing (orphaned row), which shows the new "could not be loaded" line |
| File share, password | `/share/<token>` | `legacy-file-share-gate-*` | |
| File request upload | `/upload/<token>` | `legacy-upload-*` | |
| Shared 3D scan | `/share/twin/<token>` | `legacy-3d-scan-share-*` | Light header; the viewer is a dark WebGL media stage |
| Invalid link | `/portal/<bad>` | `state-invalid-portal-375` | |

**Not captured:** `/external/respond/<token>` (RFI or submittal reply). It is light-converted, but prod has no RFIs, submittals or external links to point it at.

**Intentionally dark (media only):** the slideshow presentation, the `<video>` element on file shares, and the 3D scan WebGL viewport with its HUD.

The Next.js "N" badge in the bottom-left corner is the dev-server indicator. It is not part of the product.
