# Items capability audit — existing projects (READ-ONLY)

Per P1-P4 (Opus review): new projects now default `items` to `included: false`
(`supabase/migrations/20260924133000_items_seed_off.sql`). This audit checks whether any
**existing** project with `items` still `included: true` is actually depending on that — i.e.
whether turning it off would hide real client-visible content.

## Finding

**8 of 8** existing projects with `project_client_capabilities.capability_id = 'items'` and
`included = true` have **zero** `site_walk_items` rows (`item_count: 0` for every one,
`photo_360_item_count: 0` for every one). None have a reviewed publication either.

| Project | item_count | Recommendation |
|---|---|---|
| Quick Scans | 0 | TURN OFF (test/engineering fixture, no data) |
| 360 Library | 0 | TURN OFF (fixture, no data) |
| Test | 0 | TURN OFF (fixture, no data) |
| Phase1 Mavic3E mission 0015 (`4642aab7…`) | 0 | TURN OFF (no data) |
| Phase1 Mavic3E mission 0015 (`1acd1aca…`) | 0 | TURN OFF (no data) |
| AOB205 — ASU | 0 | TURN OFF (no data — Items was never actually used here) |
| HouseWalk (engineering fixture) | 0 | TURN OFF (fixture, no data) |
| Payne Hall | 0 | TURN OFF (no data) |

## Recommendation

Every existing project with `items: included=true` currently shows an empty Items section (or
would, the moment a client visited it) with nothing behind it — turning it off would not remove
anything a client can currently see, and brings these 8 projects in line with the same
default-off posture new projects now get. No mixed-tense/inconsistent state to worry about
(no project has genuine item data currently gated by this flag).

**Not executed.** This is READ-ONLY. Turning these off requires the same
`project_client_capabilities` write path as any other scope edit (owner UI / `PUT
/api/vnext/projects/[projectId]/scope`) — Brian can do this from the owner scope editor once he
approves the recommendation, or it can be prepared as an explicit, ID-scoped SQL update the same
way the P1-M1 package was, if preferred.
