# Slate360 Global UX Doctrine

Last Updated: 2026-05-13
Status: Authoritative V1 UX doctrine. Documentation only.

## Purpose

Slate360 is a professional field-to-office visual documentation platform. Every screen should help users capture field truth, organize work, coordinate people, and deliver results without decorative filler or brittle one-off UI systems.

## Core Rules

1. Screens must feel spacious, thumb-friendly, and organized.
2. Spacious does not mean empty; large unused areas are bad.
3. Prime mobile space must be used for actions users value.
4. No giant passive metrics unless they are clickable and actionable.
5. No explanatory paragraphs under obvious buttons.
6. Labels must be intuitive enough to stand alone.
7. Complex tools belong in drawers, sheets, tabs, or subpages.
8. Normal shell pages use contained scrolling; active capture and plan tasks use fixed task shells.
9. Quick Walk and Plan Walk must share one capture system where possible.
10. Every object should support appropriate actions: open, edit, rename, archive, delete, duplicate where safe, and link or change Worksite or Project.
11. Users must always have a clear way back.

## Plan Pin Rules

- Draft pins are draggable before save.
- Saved pins are locked by default.
- Saved pins move only through an explicit Move Pin or Edit Location mode.
- Saved pins are deletable only through confirmation.
- Moving or interacting with saved pins must never create duplicate pins.

## Site Walk Three-Act Model

Site Walk follows the three-act model:

| Act | Name | Owns |
|---|---|---|
| Act 1 | Set the stage | Worksite or Project, plans, files, people, and context |
| Act 2 | Capture field truth | Stops, photos, pins, notes, markup, metadata, and attachments |
| Act 3 | Deliver results | Reports, proposals, closeout or audit records, and share links |

## Platform Ownership

- SlateDrop is the file backbone.
- Organization-level collaboration belongs in Account, Admin, or Operations.
- Worksite and Project-level collaboration belongs inside that Worksite or Project.
- Future apps remain hidden until functional.
- Authenticated V1 surfaces must not show Coming Soon, demo, fake, placeholder, beta/test, or non-actionable metric content.

## Visual Direction

- The V1 visual direction is Graphite Glass + restrained amber + muted teal, not harsh black/orange.
- Do not do global color migration without tokens.
- Desktop and landscape must be designed, not stretched mobile.

## Implementation Guardrail

This doctrine is a product and UX contract. It does not authorize broad UI redesign, app-wide color migration, schema changes, Trigger changes, or Site Walk capture/plan behavior changes without an approved implementation slice.
