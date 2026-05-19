# External AI UX Review Packet

Last Updated: 2026-05-13
Status: Sanitized packet for external AI review.

## Safety Note

This packet is safe to paste into external UX tools such as Gemini, Claude, Grok, or v0. It intentionally excludes secrets, access tokens, Supabase passwords, API keys, environment variables, private deployment credentials, backend quick-access instructions, and long raw project memory.

## 1. Slate360 Product Summary

Slate360 is a professional field-to-office visual documentation platform. It helps construction, facilities, operations, and owner teams capture site conditions, organize evidence, coordinate collaborators, and turn field records into polished deliverables.

The first app-store-facing V1 product is Site Walk. Other apps exist conceptually or partially in the codebase but should remain hidden until functional.

## 2. Site Walk V1 Current Functional State

Site Walk is a mobile-first field documentation workflow. It supports Worksites or Projects, walks, plans, plan pins, captures, notes, markup, attachments, reports, and shareable deliverables.

## 3. What Works

- Site Walk plans load.
- Pan and zoom work on plan imagery.
- Long press creates a plan-linked capture.
- Saved plan pins can be opened.
- Site Walk Home has moved toward a compact command-center layout.
- Worksite terminology is now preferred for lower-tier Site Walk containers.

## 4. What Is Broken

- Saved plan pins cannot yet be moved or deleted correctly.
- Attempting to move or interact with saved pins may create duplicate pins.
- Plan navigation, search, layers, and thumbnails are incomplete.
- Quick Walk and Plan Walk are not unified under one shared capture system.
- Some visible surfaces still risk filler, duplicate navigation, passive metrics, or unfinished-app exposure.

## 5. Three-Act Model

Site Walk follows a three-act model:

| Act | Name | User job |
|---|---|---|
| Act 1 | Set the stage | Choose the Worksite or Project, plans, files, people, and context |
| Act 2 | Capture field truth | Capture stops, photos, pins, notes, markup, metadata, and attachments |
| Act 3 | Deliver results | Produce reports, proposals, closeout records, audit records, and share links |

## 6. Worksite Vs Project Terminology

Use Worksite for lower-tier field documentation containers. A Worksite can be a jobsite, building, campus area, facility, or scoped location.

Use Project for higher-tier project-management contexts with advanced PM expectations such as schedules, budgets, RFIs, submittals, change logs, and enterprise oversight.

## 7. SlateDrop File-Backbone Concept

SlateDrop is the platform file backbone. It should hold plans, photos, captures, attachments, deliverables, shared files, and evidence records. Site Walk should write field evidence into the SlateDrop-backed file system over time.

## 8. Collaboration Model

- Organization-level seats, roles, billing, and access belong in Account, Admin, or Operations.
- Project or Worksite-level collaborator access belongs inside each Worksite or Project.
- Cross-organization subscriber collaboration should be scoped per Worksite or Project, not treated as full organization ownership.

## 9. Design Direction

The visual direction is Graphite Glass + restrained amber + muted teal. The product should feel premium, calm, organized, field-ready, and native-app-like. It should not feel like harsh black/orange dashboards, decorative marketing pages, or a pile of unrelated card systems.

Mobile screens should be thumb-friendly and spacious without wasting prime space. Desktop and landscape layouts should be deliberately designed, not stretched mobile views.

## 10. Current UI Problems

- Filler pages or placeholder-like surfaces can make the product feel unfinished.
- Duplicate shells, headers, and nav systems make the app feel inconsistent.
- Capture UI is inconsistent between Quick Walk and Plan Walk.
- Plan tools are missing or underdeveloped: sheet navigation, search, layers, thumbnails, and pins drawer.
- Pin move/delete is broken or unsafe.
- Non-actionable metrics take too much space when they are not clickable.
- App Store V1 has hidden-app risk if unfinished apps are visible in authenticated navigation.

## 11. Questions For External AI Review

Please review the product context above and suggest practical UX patterns for:

1. App shell layout for V1 authenticated mobile and desktop surfaces.
2. Site Walk Home layout as a compact command center.
3. Plan Walk layout that maximizes plan canvas while preserving tools.
4. Capture, Details, Attachments, and Markup layout for mobile field use.
5. Plan tools drawer structure for Sheets, Search, Pins, and Layers.
6. App Store V1 hidden-surface strategy for unfinished apps.
7. Clear labels for Worksite, Walk, Stop, Pin, Report, and Share actions.
8. Reusable patterns future apps can adopt without creating duplicate shells or vibe-coded filler.
