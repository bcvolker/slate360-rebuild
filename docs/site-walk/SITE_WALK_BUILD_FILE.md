# Site Walk Build File

Last Updated: 2025-05-18

## Conceptual Architecture
- Site Walk is an app module within the Slate360 shell.
- It requires the `site_walk` app entitlement (standard or pro) to unlock.
- The Slate360 platform is a unified web and PWA-installable product.
- Site Walk acts as the first live, sellable application on the platform.

## Current System State
- The `basic` and `pro` tiers need to be refactored to `standard` and `pro` respectively.
- The entitlement model relies heavily on old whole-org tiers.
- Site Walk routes should be correctly guarded behind an active `site_walk` modular entitlement.
- The Slate360 project tools unlock when an organization possesses at least one active module.

## Required Implementations
1. **Tier Renaming**: Migrate code from `basic` to `standard` for all Site Walk entitlements.
2. **Access Guards**: Ensure routes like `/app/site-walk/...` are guarded by valid `site_walk` entitlements.
3. **Purchasing & Provisioning**: Enable complete and error-free checkout for Site Walk on Stripe, handling both standard and pro plans smoothly. Ensure webhooks correctly activate `site_walk` in the organization's subscription.
4. **Visibility Checks**: Enforce Site Walk as the primary accessible module, keeping other modules in a "Coming Soon" or conditionally locked state without active subscriptions.