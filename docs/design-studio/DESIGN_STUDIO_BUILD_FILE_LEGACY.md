# Design Studio Build File

Last Updated: 2025-05-18

## Conceptual Architecture
- Design Studio is an app module planned for the Slate360 platform.
- Gated by the `design_studio` entitlement (standard/pro).
- Intended for combination with Content Studio in the "Studio Bundle".

## Current System State
- The UI features elements referencing Design Studio.
- The module is strictly NOT fully implemented or sellable.

## Required Implementations
1. **Public Marketing UI**: Display Design Studio as "Coming Soon" or "Under Development".
2. **In-App Handling**: Ensure the module appears locked or with a "Coming Soon" badge. Do not expose incomplete functionality.
3. **Billing Foundation**: Prepare backend fields to track `design_studio` tiers within `org_app_subscriptions`, but leave it dormant.