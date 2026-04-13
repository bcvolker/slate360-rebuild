# 360 Tours Build File

Last Updated: 2025-05-18

## Conceptual Architecture
- 360 Tours is an upcoming app module within the Slate360 platform.
- It is planned to be gated behind the `tours` app entitlement (standard or pro).
- It will integrate with Site Walk in bundles like the Field Bundle.

## Current System State
- The UI features elements referencing 360 Tours.
- The application logic may have placeholders.
- The module is currently NOT fully sellable or active.

## Required Implementations
1. **Public Marketing UI**: Display 360 Tours as "Coming Soon" or "Under Development".
2. **In-App Navigation**: Ensure navigation links show "Coming Soon" and prevent users from accessing broken or unfulfilled routes.
3. **Bundle Awareness**: Support `tours` entitlement definitions for future bundles (Field Bundle, All Access), but keep the module locked until ready.
4. **Tier Structure Setup**: Define the backend mappings for `tours` to have standard/pro tiers, but prevent checkout flows until the product is complete.