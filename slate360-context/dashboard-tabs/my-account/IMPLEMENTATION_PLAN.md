# My Account — Implementation Plan

## Purpose
Centralize profile, subscription, security, usage, and API key management for users and org admins.

## Current State
- Route scaffold exists.
- Full backend parity and admin depth remain incomplete.

## Source Coverage
Derived from uploaded `raw-upload.txt` plus current account APIs.

## MVP Scope
1. Profile and organization overview.
2. Subscription/plan visibility and billing portal access.
3. Usage metrics (storage/credits/activity).
4. API key generation/revocation.

## Data Contracts
- `UserProfile`, `OrgOverview`, `SubscriptionInfo`, `UsageInfo`, `ApiKeyInfo`, `SecurityEvent`.

## API Plan
- `GET /api/account/overview`
- `PATCH /api/account/profile`
- `POST /api/account/billing-portal`
- `GET /api/account/usage`
- API key lifecycle endpoints.

## Customization Requirements
- Section reorder and collapse.
- Saved account dashboard presets.
- Optional compact/expanded density modes.

## Dependencies
- Stripe customer portal integration.
- Org role-aware controls.

## Definition of Done
- Account management tasks are complete without leaving Slate360.
- Preferences and view settings persist.
