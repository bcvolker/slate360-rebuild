# Slate360 Platform — Env & Tool Matrix

Last Updated: 2026-04-13

## Environment Variables

### Supabase (Required)
| Variable | Where Referenced | Status |
|----------|-----------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | Present in `.env` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client | Present in `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client | Present in `.env` |
| `SUPABASE_JWT_SECRET` | JWT verification | Present in `.env` |
| `SUPABASE_WEBHOOK_SECRET` | Supabase webhooks | Present in `.env` |
| `SUPABASE_ACCESS_TOKEN` | Supabase Management API | Present in env (Codespace secret) |

### AWS S3 (Required for file features)
| Variable | Where Referenced | Status |
|----------|-----------------|--------|
| `AWS_ACCESS_KEY_ID` | `lib/s3.ts` | Present in `.env` |
| `AWS_SECRET_ACCESS_KEY` | `lib/s3.ts` | Present in `.env` |
| `AWS_REGION` | `lib/s3.ts` | Present (`us-east-2`) |
| `AWS_S3_BUCKET` | `lib/s3.ts` | Present (`slate360-storage`) |
| `SLATEDROP_S3_BUCKET` | SlateDrop storage | Present in `.env` |

### Stripe (Required for billing)
| Variable | Where Referenced | Status |
|----------|-----------------|--------|
| `STRIPE_SECRET_KEY` | `lib/stripe.ts` | Present in `.env` |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | Present in `.env` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe | Present in `.env` |
| `STRIPE_PRICE_*` (22+ vars) | Plan/bundle/addon pricing | Present in `.env` |

### Email
| Variable | Where Referenced | Status |
|----------|-----------------|--------|
| `RESEND_API_KEY` | `lib/email.ts` | Present in `.env` |
| `SENDGRID_API_KEY` | `lib/email.ts` (fallback) | Present in `.env` |
| `EMAIL_FROM` | Sender address | Present in `.env` |
| `EMAIL_FROM_NAME` | Sender display name | Present in `.env` |

### Maps & Geospatial
| Variable | Where Referenced | Status |
|----------|-----------------|--------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Map components | Present in `.env` |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Styled maps | Present in `.env` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox (fallback/alternative) | Present in `.env` |

### Rate Limiting
| Variable | Where Referenced | Status |
|----------|-----------------|--------|
| `UPSTASH_REDIS_REST_URL` | `lib/server/rate-limit.ts` | Present in `.env` |
| `UPSTASH_REDIS_REST_TOKEN` | `lib/server/rate-limit.ts` | Present in `.env` |

### Platform Admin
| Variable | Where Referenced | Status |
|----------|-----------------|--------|
| `CEO_EMAIL` | Admin access gates | Present in `.env` |
| `PRIMARY_CEO_EMAIL` | Primary admin | Present in `.env` |
| `PLATFORM_ADMIN_EMAILS` | Admin list | Present in `.env` |
| `SLATE360_PLATFORM_ADMINS` | Platform admin list | Present in `.env` |

### AI / External APIs
| Variable | Where Referenced | Status |
|----------|-----------------|--------|
| `OPENAI_API_KEY` | AI features | Present in `.env` |
| `ANTHROPIC_API_KEY` | AI features | Present in `.env` |
| `GPU_WORKER_SECRET_KEY` | GPU worker auth | Present in `.env` |
| `WORKER_SECRET_KEY` | Worker auth | Present in `.env` |

### Third-Party Integrations
| Variable | Where Referenced | Status |
|----------|-----------------|--------|
| `PROCORE_CLIENT_ID/SECRET/REDIRECT_URI` | Procore integration | Present in `.env` |
| `AUTODESK_CLIENT_ID/SECRET/CALLBACK_URL` | Autodesk integration | Present in `.env` |
| `DOCUSIGN_*` (4 vars) | DocuSign integration | Present in `.env` |
| `ADOBE_SIGN_*` (3 vars) | Adobe Sign integration | Present in `.env` |

### Deployment
| Variable | Where Referenced | Status |
|----------|-----------------|--------|
| `VERCEL_TOKEN` | Vercel API access | Present in env (Codespace secret) |
| `NEXT_PUBLIC_SITE_URL` | Public URL | Present in `.env` |
| `NEXT_PUBLIC_BASE_URL` | Base URL | Present in `.env` |
| `CRON_SECRET` | Vercel cron auth | Present in `.env` |

## External Services

| Service | Purpose | Access Level | Status |
|---------|---------|-------------|--------|
| Supabase | Auth + primary DB | Read/write via API | **Active** — project `hadnfcenpcfaeclczsmm` verified |
| AWS S3 | File storage | Read/write via SDK | **Active** — credentials in `.env` |
| Stripe | Billing + webhooks | Read/write via API | **Active** — key verified |
| Vercel | Hosting + cron + env | Read/write via API | **Active** — token verified (3 projects found) |
| Upstash Redis | Rate limiting | Read/write via REST | **Active** — credentials in `.env` |
| Google Maps | Geospatial features | Client-side API | **Active** — key in `.env` |
| Resend | Email delivery | API | **Active** — key in `.env` |
| Sentry | Error tracking | Client + server | **Active** — configs exist |

## Tool/CLI Access (Codespace)

| Tool | Installed? | Authenticated? | Scope |
|------|-----------|----------------|-------|
| **Git** | Yes | Yes (`bcvolker` via GITHUB_TOKEN) | Full read/write/push |
| **GitHub CLI (`gh`)** | Yes (v2.89.0) | Yes (`bcvolker`) | Full repo access |
| **Vercel CLI** | No (not installed, but API works via `VERCEL_TOKEN`) | Yes (via token) | Read/write via API |
| **Supabase CLI** | No (not installed, but API works via `SUPABASE_ACCESS_TOKEN`) | Yes (via token) | Read/write via API |
| **Stripe CLI** | No | Via `STRIPE_SECRET_KEY` in `.env` | Read/write via API |
| **AWS CLI** | No | Via credentials in `.env` | Read/write via SDK |
| **Node.js** | Yes | N/A | Runtime available |
| **npm** | Yes | N/A | Package management |

## What Can Be Verified From Repo Only

- All route files exist
- All component files exist
- Type definitions complete
- Migrations exist for all tables
- Middleware routing logic
- Auth wrapper implementations

## What Requires Live External Access

- Supabase RLS policies and function behavior
- S3 bucket permissions and CORS
- Stripe product/price configuration
- Vercel deployment status and env var propagation
- Email delivery (Resend account health)
- Google Maps API quota

## Operational Risks

1. **72 env vars** across `.env` — missing any one could break a feature silently
2. **No `.env.local`** — all config in `.env` (which is gitignored but shared via Codespace secrets)
3. **Stripe webhook secrets** appear twice in `.env` — could cause confusion
4. **Multiple email providers** (Resend + SendGrid) — unclear which is active
5. **Multiple admin email vars** (`CEO_EMAIL`, `PRIMARY_CEO_EMAIL`, `PLATFORM_ADMIN_EMAILS`, `SLATE360_PLATFORM_ADMINS`) — potential inconsistency
