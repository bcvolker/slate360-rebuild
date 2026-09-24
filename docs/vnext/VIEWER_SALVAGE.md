# Viewer salvage — post-Phase-1

These are capability references. They are not design templates.

Do not merge their branches. Do not copy their page composition, styling, navigation, spacing, tabs, toolbars, branding, or client-facing authoring controls. Do not delete them in a cleanup pass because the demos look unused.

Slice 12B did not import any of this UI. Current vNext engines stay canonical:

- Reality: Spark
- Geometry: the current mesh / model viewer
- Point cloud: the Potree path
- 360: Photo Sphere Viewer
- Plans: `VnextPlanViewer`
- Thermal: the current thermal path
- Saved Views and Presentation: the current vNext system

Payne and Backyard live on preview/reconstruction branches, not on `feature/ui-vnext-phase1`.

## Reuse later, inside vNext

| Source | Keep the behavior | Do not bring |
|---|---|---|
| Payne / Backyard | `walk-step.ts`, `SplatWalkBar`, Walk / Dollhouse / Plan, Normal / Leap, click-to-move stride and floor filtering | The initial Walk pose. Do not start a second splat viewer |
| Aerial | Model marker opens a panorama. Closing the panorama restores the same model camera. `fitBasePlane`, `volumeAbovePlane`, count, elevation ramp | `applyAerialGravity` (broken). Do not replace the Reality or Geometry engines |
| Hassayampa / Gammage | Named stops, next / previous, thumbnails, hotspot navigation | Pannellum |
| Sun Deck | Radiometric Celsius-grid probing. Generalized 2D similarity registration | The page and tabs, brass or maroon shells, public demo assets, authoring controls on client surfaces, the custom WebGL mesh and point-cloud renderer |

## One viewer language

Slate360 does not need one identical viewer for every representation.

It needs one cohesive viewer language plus representation-specific tools.

Shared across representations: project context, source / date / version, representation navigation, source navigation, Saved Views, Presentation, history semantics, buttons, typography, spacing, permissions, and mobile behavior.

The viewport tools change with the evidence. Walk controls stay on Reality. A thermal probe stays on Thermal. Mesh measurement stays off the 360 viewer. Plan pan and zoom stay on Plan.

Demo page compositions have no design authority.
