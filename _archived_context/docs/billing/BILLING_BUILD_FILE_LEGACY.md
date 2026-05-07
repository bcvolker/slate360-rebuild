# Billing Build File

Last Updated: 2025-05-18

## Canonical Architecture (The True Model)
- **One System, One Subscription**: A unified subscription and entitlement system for web and PWA surfaces.
- **Organization-Level Access**: Subscriptions apply to organizations/workspaces, not individuals.
- **Module Centric**: Billing is for App Modules (Site Walk, 360 Tours, Design Studio, Content Studio), not the general Slate360 platform.
- **Workspace Gating**: The Slate360 shell (dashboard, billing, settings) is free for authenticated users. The real workspace tools (projects, files, command center) unlock only if the organization has at least one active paid module.
- **Tiers**: Each app module supports `none`, `standard`, and `pro` tiers.

## Migration Requirements
1. **Deprecate Legacy Pricing**:
   - Retire the old org-wide tiers (`trial`, `standard`, `business`, `enterprise`).
   - Stop routing new user purchases to the old checkout flows.
   - Keep old code solely for necessary backward compatibility with existing users/data.
2. **Rename Basic to Standard**:
   - Globally replace `basic` with `standard` (e.g., `site_walk_basic` to `site_walk_standard`).
   - Update TypeScript types, UI plan names, Stripe mappings, webhook processors.
3. **Modular Entitlements Source of Truth**:
   - Implement/refine `resolveModularEntitlements()` to provide core boolean flags:
     - `hasAnyPaidModule`
     - `canUseProjectWorkspace`
     - App specific flags (e.g., `apps.site_walk.active`)
4. **Explicit Bundles Only**:
   - Support `field_bundle`, `studio_bundle`, `all_access`.
   - Do NOT implement dynamic or auto-discounting. Use pure explicit Stripe bundle products.
5. **Pricing Page Presentation**:
   - Restructure UI to present individual apps and bundles.
   - Present unfinished apps as "Coming Soon". Only sell fully completed apps (like Site Walk) right now.
6. **Checkout & Webhooks**:
   - Fully test webhook idempotency and organization state updates for modules, bundles, and add-ons (storage/credits).