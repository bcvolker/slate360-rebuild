# Slate360 — Immutable Architecture Reference (App-Centric Model)

> Feed this file to any AI agent before it touches the codebase.  
> Last verified: 2026-04-09 | Branch: main  
> This document defines the **permanent business model**. All legacy tier references have been eradicated. No future AI may re-introduce "creator", "model", "business", or similar as the source of truth.

---

## 1. Core Business Model – App-Centric Ecosystem

Slate360 is an **app-centric ecosystem**. Revenue is generated exclusively through:

- **Slate360 Core** — The foundational app (dashboard, project hub, SlateDrop nervous system, basic deliverables). All users start here (free tier with strict limits).
- **Add-On Apps** — Purchased individually or in bundles:
  - Tour Builder (360 panorama tours, video hotspots, client portals).
  - Site Walk (punch lists, site photos, mobile-first inspections).
  - Future apps (Photo Log, Plan Review, SlateDrop Standalone, etc.).

**Entitlements are based exclusively on explicit App Feature Flags**, stored in the `org_feature_flags` table. Legacy tier names are **deprecated** and must never be used for access control. The `organizations.tier` column will be phased out in favor of flag-driven entitlements.

**Bundle Rules (to prevent cannibalization)**:
- When multiple add-ons are active (or bundled in a higher plan), entitlements and storage are **pooled** (e.g., 40 GB shared across Tour Builder + Site Walk).
- Standalone subscriptions are **isolated**: A standalone Tour Builder subscription grants 5 GB **only** for tour assets and does not unlock Site Walk features or shared storage. Cross-app leakage is prevented by `canUseAppStorage(appKey)` guards.
- Slate360 Core is the required base; add-ons enhance it. Apps must interoperate cleanly when bundled (e.g., a Tour Builder deliverable can link to a Site Walk punch list) but never allow a standalone lower-tier user to access higher-tier capabilities.

**The Downgrade Law** (immutable rule):
If an org cancels any app subscription, their **live client links (`/portal/[token]`)** do **not** break (to protect client experience and brand reputation). However, they **instantly degrade**:
- Heavy watermarking on all deliverables.
- Edit locks on tours/walks (view-only mode).
- Prominent upgrade prompt ("Upgrade to restore full access").
- Storage quota shrinks; new uploads blocked beyond limit.
- This is enforced at render time in the portal viewer and upload guards. Existing tokens remain valid but are re-evaluated against current flags on every view.

---

## 2. The SlateDrop Nervous System

SlateDrop is **not** a simple file host. It is the **central nervous system** for all client delivery, permissions, and cross-app collaboration.

**Core Principles**:
- Every app (Slate360 Core, Tour Builder, Site Walk, etc.) **automatically provisions a root folder** in SlateDrop upon first use (`project_folders` table with `app_key` and `is_root = true`).
- All deliverables (tours, reports, punch lists, photos) are saved into these folders or user-created subfolders.
- Clients do **not** need a paid Slate360 account. Permissions are granted by email → they receive a magic link or token that grants temporary view/upload access.
- Folders support hierarchical structure, branding inheritance, and audit logging.
- All apps read/write through the same SlateDrop APIs, ensuring seamless interoperability in bundles while enforcing isolation for standalone subscriptions.

**Folder Provisioning Flow** (on first app use):
1. Org subscribes to an add-on (via Stripe webhook → `org_feature_flags`).
2. On first navigation to the app, a root folder is created (`app_key = 'tour_builder'` or `'site_walk'`).
3. User can create custom subfolders, move assets, and share specific folders with clients.

**Client Delivery**:
- Deliverables are shared via `/portal/[token]` (token tied to a folder or specific asset).
- Permissions are managed in `slatedrop_folder_permissions` (see Section 8).
- Uploads from clients land directly in the granted folder (presigned S3 URLs with strict validation).

---

## 3. Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 15 (App Router, RSC-first) |
| Runtime | React | 19 |
| Language | TypeScript | 5.x, `strict: true` |
| Auth + DB | Supabase | Hosted — ref `hadnfcenpcfaeclczsmm` |
| File Storage | AWS S3 | Bucket `slate360-storage`, region `us-east-2` |
| Billing | Stripe | Webhooks + Checkout Sessions |
| Hosting | Vercel | Auto-deploy from `main` |
| Error Monitoring | Sentry | `@sentry/nextjs` (client + server + edge) |
| Analytics | PostHog | `posthog-js` (privacy guard on portal routes) |
| Rate Limiting | Upstash Redis | Sliding window via `lib/server/rate-limit.ts` |
| UI Components | Shadcn UI | `new-york` style, Industrial Gold + Dark Glass (per DESIGN.md) |
| Icons | Lucide React | Via Shadcn |
| Fonts | Geist Sans / Geist Mono | `next/font/google` |

---

## 4. Auth Model

(Supabase clients, super-admin gate, route auth wrappers, and access control routes remain as previously defined, with one critical update:)

All gates now use **App Feature Flags** via `resolveOrgEntitlements(orgId)` (which queries `org_feature_flags`). Legacy `getEntitlements(tier)` is deprecated and will be removed. Middleware must enforce:
- Standalone-only users are walled into their purchased apps.
- Bundled users get pooled capabilities across Slate360 Core + add-ons.
- Downgrade Law degradation is applied at the portal rendering layer.

---

## 5. Billing & Entitlements (Stripe as SSOT)

Stripe remains the single source of truth. Webhook (`app/api/stripe/webhook/route.ts`) now writes **only** to `org_feature_flags` (no `organizations.tier` updates).

- On purchase: `upsert` flag for the specific app (`standalone_tour_builder = true`, etc.) + record `stripe_subscription_id`.
- On cancel (`customer.subscription.deleted`): Set flag = false, trigger Downgrade Law (add `downgraded_at` timestamp, reduce storage quota).
- Entitlements helper: `canAccessApp(appKey: 'tour_builder' | 'site_walk' | 'core')`, `canUseAppStorage(appKey, bytes)`, `isDegraded(orgId)`.

Legacy tier hierarchy and `TIER_MAP` are **removed**. Pricing/limits are defined per app or bundle in Stripe metadata and mirrored in flags.

---

## 6. File Storage (S3 + SlateDrop Nervous System)

All storage flows through SlateDrop. S3 key structure:
```
orgs/{orgId}/slatedrop/{folderId}/{appKey}/{timestamp}_{sanitized_filename}
```

Upload workflow, presigned URLs, and security rules remain, but all calls now pass through `enforceAppStorageAccess(appKey)` to prevent cannibalization (standalone Site Walk cannot host Tour Builder panoramas).

---

## 7. Deliverable Portal (Token-Gated Access)

Route: `/portal/[token]` (or `/portal/folder/[token]`).

- Public, unauthenticated.
- On load: Resolve token → check current `org_feature_flags` → apply Downgrade Law if applicable (watermark, lock, upgrade banner).
- Atomic view claiming via `claim_deliverable_view(p_token)` RPC (updated to also check degradation status).
- Branding applied via CSS variables (Industrial Gold accent, Dark Glass surfaces per DESIGN.md).

---

## 8. Middleware, Security, Project Structure, Database Conventions, Environment Variables, and Commands

(These sections remain structurally similar but updated for app-centric model.)

**Database Conventions (Updated)**:
- All entitlement logic uses `org_feature_flags` (feature_key, enabled, app_key, stripe_subscription_id, downgraded_at).
- Folder writes **must** use `project_folders` with `app_key`.
- New table: `slatedrop_folder_permissions` (see separate schema proposal below).
- RPCs updated to be app-aware (`increment_org_app_storage(app_key, bytes)`).

**Import & File Rules**: No file > 300 lines. All new code must reference this architecture and DESIGN.md.

**Critical Immutable Rules**:
- Never re-introduce legacy tiers.
- Enforce Downgrade Law on every portal render and upload.
- SlateDrop is the nervous system — every app provisions and respects its folders/permissions.
- Apps interoperate in bundles, isolated when standalone.

This document is now the single source of truth for the app-centric business model. Any deviation requires CEO approval and a version bump here.

---

## Proposed Schema for slatedrop_folder_permissions (Task 2)

```sql
-- supabase/migrations/20260409XXXXXX_slatedrop_folder_permissions.sql
CREATE TABLE slatedrop_folder_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES project_folders(id) ON DELETE CASCADE,
  email TEXT NOT NULL,                    -- external client's email (no auth required)
  permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'upload', 'edit')),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                 -- optional expiry for time-limited access
  token TEXT UNIQUE,                      -- magic-link token (uuid or hash) for unauthed access
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_folder_permissions_folder ON slatedrop_folder_permissions(folder_id);
CREATE INDEX idx_folder_permissions_email ON slatedrop_folder_permissions(email);
CREATE INDEX idx_folder_permissions_token ON slatedrop_folder_permissions(token);

-- RLS Policies
ALTER TABLE slatedrop_folder_permissions ENABLE ROW LEVEL SECURITY;

-- Org members (who granted permission) can manage their folder permissions
CREATE POLICY "org_members_manage_own_folder_permissions"
  ON slatedrop_folder_permissions
  FOR ALL
  USING (
    granted_by IN (
      SELECT id FROM auth.users 
      WHERE org_id = (SELECT org_id FROM project_folders WHERE id = folder_id)
    )
  );

-- Clients can read their own permission row via email or token (no full account needed)
CREATE POLICY "clients_read_own_permission"
  ON slatedrop_folder_permissions
  FOR SELECT
  USING (
    (email = current_setting('request.jwt.claims', true)::json->>'email' OR token = current_setting('request.jwt.claims', true)::json->>'token'))
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Service role (webhook, backend) can write freely
CREATE POLICY "service_role_full_access"
  ON slatedrop_folder_permissions
  FOR ALL
  USING (auth.role() = 'service_role');
```

**How It Works Securely**:
- An internal user grants permission by email → row is inserted with a unique `token` (e.g., a short-lived JWT or random hash).
- Client receives a magic link: `/portal/access?token=abc123&email=client@example.com`.
- The link validates the token/email against this table without requiring client login.
- Permission is scoped to one folder (view = see files, upload = presigned upload into that folder only, edit = modify metadata).
- On access, middleware or server component sets a short-lived context (e.g., `current_folder_permission`) that upload/view routes check.
- To prevent abuse: tokens expire, RLS ensures clients cannot see other rows, and all S3 operations are presigned with strict key validation (must match the permitted folder_id).
- Audit log can be added via trigger on insert/update.

This schema enables external clients to collaborate on specific SlateDrop folders without a paid account, while keeping everything tied to the nervous system. It supports the Downgrade Law (permissions can be soft-disabled on degradation by setting `is_active = false` or adding a degraded flag).

Update `SLATE360_PROJECT_MEMORY.md` and run GitNexus analysis after merging this. All future work must reference this architecture first.