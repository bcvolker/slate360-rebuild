# Dashboard Vision — LOCKED direction (CEO, 2026-07-01)

**Correction to prior "hero band" idea:** do NOT build a long horizontal rectangular
hero band — it's a useless waste of space. The hero is a **squarish** feature block
(more square than wide) that is a quick-access point + visual aid of the user's last work.

## Hero (featured project)
- **Squarish** tile (not a wide band). Background = a real visual of the user's most
  recent work on the featured project:
  - Digital twin → a **snapshot of the twin** (rendered still / preview frame).
  - 360 photo → a **snapshot from inside the 360**.
  - Site Walk → the **first photo taken in that walk**.
- **Overlaid** on the image: project name + key project info (status, last activity, counts).
- Tapping it = **enter that project** to manage it (the project workspace:
  docs/plans upload, calendar, contacts, notifications, collaborators, sharing).
- **User can choose the featured project.** In the horizontal scrolling projects bar
  in the menu, each project gets a **"Make primary / Set as featured"** control so the
  project they care about stays featured at the top of the dashboard at all times.
- Data note: `load-dashboard-home-data` currently types `imageUrl` but never populates
  it — the hero's whole value is the real visual, so the loader must resolve the
  snapshot (twin preview / 360 still / first walk photo) for the featured project.

## Dashboard layout — expandable sections + tool widgets (minimal scrolling)
Users should NOT have to scroll a lot. Use **expandable sections** that also contain
**tools**, all clean/tight/premium (not amateur, not AI-vibe). Widgets planned:
- **Usage widget** — tokens/credits, data + storage usage, with an **easy "buy more
  tokens"** action linked to the user's payment method on file (Stripe).
- **PDF widget(s)** — feature-rich (compose/preview/send deliverable PDFs).
- **Map / location widget** — tied to **Google Maps / Google 3D Tiles**: quick
  interactive maps the user can **send to stakeholders** (directions, material
  drop-off locations) that recipients' phones can open for turn-by-turn directions.
- More widgets to come — build the dashboard **widget system to be scalable** (new
  apps + new widgets slot in without a redesign; no "coming soon" language anywhere).

## Org-level management (Slate360 dashboard shell)
The overall dashboard manages **org-level** calendars, contact lists, notifications/
messages, and can **create** at the org level. Plus org **project settings**: logos,
signatures, business info (for proposals/reports), and an easy way to **send out
deliverables regardless of which app created them**.

## Cross-company collaboration (value theme)
Project linking + assign collaborators + organize by **organization + structural level**
(leadership gets first visibility into everything their employees do) + the ability for
users **outside each other's companies** to link on projects and share specific data /
deliverable types (SlateDrop-to-SlateDrop connection). Both apps get this capability.

## Grammar
Graphite Glass throughout, one accent per surface on interactive states, IBM Plex Mono
labels, 48–72px targets, no amber/glow/rounded-full/hardcoded-hex, no "coming soon."
Related: [[slate360-ui-overhaul-and-branding]], docs/design/SCREEN_BLUEPRINT.md.
