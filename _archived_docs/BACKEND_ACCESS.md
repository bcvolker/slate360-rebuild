# Slate360 — Backend Access & Quick-Start Guide

**Last Updated:** 2026-02-26  
**Repo:** `bcvolker/slate360-rebuild` (branch: `main`)  
**Live URL:** https://www.slate360.ai

Use this document to get a new development chat/environment up and running with full backend access quickly. All credentials below are also stored in `.env.local` in the repo root.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [GitHub](#2-github)
3. [Supabase (Database + Auth)](#3-supabase-database--auth)
4. [AWS S3 (File Storage)](#4-aws-s3-file-storage)
5. [Google Maps Platform](#5-google-maps-platform)
6. [Resend (Email)](#6-resend-email)
7. [Stripe (Payments)](#7-stripe-payments)
8. [Vercel (Hosting)](#8-vercel-hosting)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Tech Stack Summary](#10-tech-stack-summary)
11. [Key Project Files](#11-key-project-files)

---

## 1. Quick Start

```bash
# Clone
git clone https://github.com/bcvolker/slate360-rebuild.git
cd slate360-rebuild

# Install (requires Node >= 20)
npm install

# .env.local should already be in the repo root with all keys
# If missing, recreate it from section 9 below

# Dev server
npm run dev        # → http://localhost:3000

# Build
npm run build

# Lint
npm run lint
```

---

## 2. GitHub

| Field | Value |
|-------|-------|
| **Repository** | https://github.com/bcvolker/slate360-rebuild |
| **Owner** | `bcvolker` |
| **Default branch** | `main` |
| **Remote** | `origin` → `https://github.com/bcvolker/slate360-rebuild` |

```bash
git remote -v
# origin  https://github.com/bcvolker/slate360-rebuild (fetch)
# origin  https://github.com/bcvolker/slate360-rebuild (push)
```

Pushes to `main` auto-deploy to Vercel.

---

## 3. Supabase (Database + Auth)

| Field | Value |
|-------|-------|
| **Project URL** | https://hadnfcenpcfaeclczsmm.supabase.co |
| **Dashboard** | https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm |
| **Project Ref** | `hadnfcenpcfaeclczsmm` |
| **Anon Key** | See `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` |
| **Service Role Key** | See `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` |
| **Access Token** | See `SUPABASE_ACCESS_TOKEN` in `.env.local` |

**Used for:** User auth (sign up, login, password reset, email confirmation), user metadata/preferences, project data, file records, billing records.

**Client libraries:**
- `@supabase/supabase-js` v2 — main client
- `@supabase/ssr` — server-side rendering helpers

**Key code files:**
- `lib/supabase/` — Supabase client creation (browser + server)
- `middleware.ts` — auth session refresh on every request
- `app/api/auth/` — auth routes (callback, confirm)

---

## 4. AWS S3 (File Storage)

| Field | Value |
|-------|-------|
| **Region** | `us-east-2` |
| **Bucket** | `slate360-storage` |
| **Access Key ID** | See `AWS_ACCESS_KEY_ID` in `.env.local` |
| **Secret Access Key** | See `AWS_SECRET_ACCESS_KEY` in `.env.local` |

**Used for:** SlateDrop file storage (uploads, PDFs, project files).

**Client libraries:**
- `@aws-sdk/client-s3`
- `@aws-sdk/lib-storage`
- `@aws-sdk/s3-request-presigner`

**Key code files:**
- `lib/s3.ts` — S3 client initialization
- `app/api/slatedrop/upload-url/` — presigned upload URL generation
- `app/api/slatedrop/complete/` — finalize upload after S3 PUT

---

## 5. Google Maps Platform

| Field | Value |
|-------|-------|
| **API Key** | See `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` |
| **Map ID** | See `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` in `.env.local` |
| **Console** | https://console.cloud.google.com/apis/credentials |

**APIs enabled and allowed by key:**
- ✅ Maps JavaScript API
- ✅ Geocoding API
- ✅ Maps Static API

**APIs enabled but NOT allowed by key (blocked by API restrictions):**
- ❌ Routes API
- ❌ Directions API

**Key restrictions:**
- Application restrictions: HTTP referrers (`*.slate360.ai`)
- API restrictions: Limited to the 3 APIs listed above

**Important:** Because of these restrictions, directions use OSRM (free routing engine) instead of Google Routes API. See `WIDGET_AND_LOCATION_MAP_HANDOFF.md` for full details.

**To fix (allow Google native routing):**
1. GCP Console → APIs & Services → Credentials
2. Edit the API key → API restrictions
3. Add "Routes API" and "Directions API" to the allowed list

**Client library:** `@vis.gl/react-google-maps` v1.7.1

**Key code files:**
- `components/dashboard/LocationMap.tsx` — main map component
- `app/api/directions/route.ts` — Geocoding + OSRM routing
- `app/api/static-map/route.ts` — Static Maps API proxy for PDF images

---

## 6. Resend (Email)

| Field | Value |
|-------|-------|
| **API Key** | See `RESEND_API_KEY` in `.env.local` |
| **From Address** | `Slate360 <noreply@slate360.ai>` |
| **Dashboard** | https://resend.com/overview |

**Used for:** Transactional emails (share links, notifications).

**Key code files:**
- `lib/email.ts` — email sending utilities
- `app/api/email/` — email API routes

---

## 7. Stripe (Payments & Billing)

Stripe keys are configured in **Vercel environment variables** (not in `.env.local`).

**Required env vars (set in Vercel):**

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side Stripe client |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `STRIPE_PRICE_CREATOR_MONTHLY` | Creator tier monthly price ID |
| `STRIPE_PRICE_CREATOR_ANNUAL` | Creator tier annual price ID |
| `STRIPE_PRICE_MODEL_MONTHLY` | Model tier monthly price ID |
| `STRIPE_PRICE_MODEL_ANNUAL` | Model tier annual price ID |
| `STRIPE_PRICE_BUSINESS_MONTHLY` | Business tier monthly price ID |
| `STRIPE_PRICE_BUSINESS_ANNUAL` | Business tier annual price ID |
| `STRIPE_PRICE_CREDITS_STARTER` | Starter credits pack price ID |
| `STRIPE_PRICE_CREDITS_GROWTH` | Growth credits pack price ID |
| `STRIPE_PRICE_CREDITS_PRO` | Pro credits pack price ID |

**Key code files:**
- `lib/stripe.ts` — Stripe client singleton
- `lib/billing.ts` — tier/price configuration, credit packs
- `lib/billing-server.ts` — server-side billing operations
- `app/api/stripe/webhook/route.ts` — Stripe webhook handler
- `app/api/billing/` — billing API routes

---

## 8. Vercel (Hosting)

| Field | Value |
|-------|-------|
| **Live URL** | https://www.slate360.ai |
| **Framework** | Next.js |
| **Build command** | `next build` |
| **Install command** | `npm install` |
| **Dev command** | `next dev` |
| **Deployment** | Auto-deploy on push to `main` |

**Vercel config:** `vercel.json` in repo root.

**Note:** Vercel has deployment protection enabled. Anonymous endpoint probing from automation returns 401. Must be authenticated or use bypass token for testing.

**Environment variables:** Stripe keys and any production-only overrides are set in the Vercel dashboard. The `NEXT_PUBLIC_APP_URL` should be `https://www.slate360.ai` in Vercel (it's `http://localhost:3000` locally).

---

## 9. Environment Variables Reference

All values are stored in `.env.local` in the repo root (not committed to git). Copy that file directly from an existing dev environment — it contains all actual keys.

The environment variable names are:

The environment variable names are:

```dotenv
# ── Supabase ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://hadnfcenpcfaeclczsmm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<see .env.local>
SUPABASE_SERVICE_ROLE_KEY=<see .env.local>
SUPABASE_ACCESS_TOKEN=<see .env.local>

# ── AWS S3 ────────────────────────────────────────────────────
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=<see .env.local>
AWS_SECRET_ACCESS_KEY=<see .env.local>
SLATEDROP_S3_BUCKET=slate360-storage

# ── Resend (Email) ────────────────────────────────────────────
RESEND_API_KEY=<see .env.local>
EMAIL_FROM=Slate360 <noreply@slate360.ai>

# ── App URL ───────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Google Maps ───────────────────────────────────────────────
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<see .env.local>
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=<see .env.local>

# ── Stripe (set in Vercel, not usually needed locally) ────────
# STRIPE_SECRET_KEY=sk_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# STRIPE_PRICE_CREATOR_MONTHLY=price_...
# STRIPE_PRICE_CREATOR_ANNUAL=price_...
# STRIPE_PRICE_MODEL_MONTHLY=price_...
# STRIPE_PRICE_MODEL_ANNUAL=price_...
# STRIPE_PRICE_BUSINESS_MONTHLY=price_...
# STRIPE_PRICE_BUSINESS_ANNUAL=price_...
# STRIPE_PRICE_CREDITS_STARTER=price_...
# STRIPE_PRICE_CREDITS_GROWTH=price_...
# STRIPE_PRICE_CREDITS_PRO=price_...
```

---

## 10. Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 15.x |
| **React** | React + ReactDOM | 19.x |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.x |
| **Database + Auth** | Supabase | 2.x JS client |
| **File Storage** | AWS S3 (us-east-2) | v3 SDK |
| **Maps** | `@vis.gl/react-google-maps` | 1.7.1 |
| **Routing Engine** | OSRM (router.project-osrm.org) | Public demo server |
| **PDF Generation** | jsPDF | 4.x |
| **Email** | Resend | 6.x |
| **Payments** | Stripe | 20.x |
| **UI Icons** | Lucide React | 0.575.x |
| **Charts** | Recharts + Chart.js | latest |
| **State** | Zustand | 5.x |
| **Web3** | wagmi + viem | latest |
| **Hosting** | Vercel | Auto-deploy from `main` |
| **Node** | ≥ 20.0.0 | Required |

---

## 11. Key Project Files

### App Routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Landing page |
| `/login` | `app/login/page.tsx` | Login |
| `/signup` | `app/signup/page.tsx` | Sign up |
| `/dashboard` | `app/dashboard/` | Main dashboard (auth required) |
| `/project-hub` | `app/(dashboard)/project-hub/page.tsx` | Project hub overview |
| `/project-hub/[projectId]` | Project-level dashboard | Per-project widgets |
| `/market` | `app/market/` | Market/trading features |
| `/slatedrop` | `app/slatedrop/` | File management |
| `/plans` | `app/plans/` | Subscription plans |

### API Routes

| Endpoint | File | Purpose |
|----------|------|---------|
| `POST /api/directions` | `app/api/directions/route.ts` | Geocoding + OSRM routing |
| `GET /api/static-map` | `app/api/static-map/route.ts` | Static Maps API proxy |
| `/api/auth/*` | `app/api/auth/` | Auth callbacks |
| `/api/billing/*` | `app/api/billing/` | Billing operations |
| `/api/stripe/webhook` | `app/api/stripe/webhook/route.ts` | Stripe webhooks |
| `/api/slatedrop/*` | `app/api/slatedrop/` | File upload, folders, sharing |
| `/api/dashboard/*` | `app/api/dashboard/` | Dashboard data (projects, widgets) |
| `/api/email/*` | `app/api/email/` | Email sending |
| `/api/projects/*` | `app/api/projects/` | Project CRUD |

### Libraries

| File | Purpose |
|------|---------|
| `lib/supabase/` | Supabase client (browser + server) |
| `lib/s3.ts` | S3 client |
| `lib/stripe.ts` | Stripe client singleton |
| `lib/billing.ts` | Tier/price config |
| `lib/email.ts` | Email helpers |
| `lib/entitlements.ts` | Feature entitlements by tier |
| `lib/utils.ts` | General utilities |
| `middleware.ts` | Auth session refresh |

### Context Documents

| File | Purpose |
|------|---------|
| `WIDGET_AND_LOCATION_MAP_HANDOFF.md` | Full widget + location map work documentation |
| `WIDGET_SYSTEM_ISSUE_TRACKER.md` | Session-by-session widget issue tracker |
| `BACKEND_ACCESS.md` | This file — credentials and quick start |
| `slate360-context/` | Architecture specs, feature docs, design guidelines |
