# Athlete360 — Implementation Plan

## Purpose
Internal invite-only coaching platform for session capture, clip review, feedback threads, and athlete assignments.

## Current State
- Stub route exists.
- Contract-level feature spec captured in uploads.

## Source Coverage
Derived from uploaded `raw-upload.txt` and `raw-chat-notes.txt` (chat notes treated as supporting only).

## Access Gate (Canonical)
- Gate by `hasInternalAccess`.
- Never gate via subscription entitlements.

## MVP Scope
1. Practice Field mode for session/rep capture and tagging.
2. Film Room mode for clip playback and annotation.
3. Coach-athlete threads per clip.
4. Homework assignment and status tracking.

## Data Contracts
- `Athlete`, `Session`, `Clip`, `ClipTag`, `ClipThread`, `HomeworkAssignment`.

## API Plan
- Session CRUD routes.
- Clip list/detail routes.
- Tagging routes.
- Thread routes.
- Homework routes.

## Customization Requirements
- 3-panel default layout (roster/clips, viewer, communication).
- Movable tool clusters by mode.
- Expandable panel groups and saved per-mode layouts.

## Dependencies
- Media ingest and clip processing pipeline.
- Permission model for coach/player roles.

## Definition of Done
- Coach can capture/review/assign; athlete can review/respond.
- Workflow state is reliable and auditable.
- Layout preferences persist.
