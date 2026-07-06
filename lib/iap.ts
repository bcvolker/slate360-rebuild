/**
 * C7: master switch for native in-app purchases. Stays false until App Store
 * Connect products/agreements are live (see docs/specs/STORE_IAP_ENTITLEMENTS.md
 * and the ASC checklist in that doc) — flip via Vercel env, same pattern as
 * NEXT_PUBLIC_APP_STORE_MODE (lib/app-store-mode.ts).
 */
export const IAP_ENABLED = process.env.NEXT_PUBLIC_IAP_ENABLED === "true";
