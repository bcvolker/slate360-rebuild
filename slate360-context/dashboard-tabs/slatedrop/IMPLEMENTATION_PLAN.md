# SlateDrop — Implementation Plan

## Purpose
Provide unified project/org file backbone for every module with secure sharing, storage controls, and artifact interoperability.

## Current State
- Built and heavily used by platform.
- Large client file still requires decomposition.

## MVP Scope
1. Complete `project_folders` migration (Phase 2).
2. Improve file operations UX consistency (upload, preview, move, share).
3. Standardize artifact linking into all dashboard tabs.

## Data & API Priorities
- Canonical folder tree on `project_folders`.
- Stable upload/download/presign APIs.
- Share token workflows (`slatedrop_shares`) and audit trails.

## Customization Requirements
- Expand/collapse folder tree and saved expansion states.
- Movable file-grid columns and density presets.
- Saved view presets per project folder context.

## Dependencies
- S3 and Supabase access controls.
- Shared table/list UI primitives.

## Definition of Done
- No new code depends on `file_folders`.
- Folder/file operations are stable and observable.
- Layout/customization preferences persist per user/project.
