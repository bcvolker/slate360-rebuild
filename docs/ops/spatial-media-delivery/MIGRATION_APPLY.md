# Spatial clips poster columns — apply status

Migration: `supabase/migrations/20260902120000_spatial_derivative_posters.sql`

Additive only:

- `spatial_clips.client_poster_key text`
- `spatial_clips.public_poster_key text`
- `spatial_clips.poster_meta jsonb default '{}'`

No `DROP`, no type rewrite.

## Inspected 2026-09-02 via service-role REST

Project: `slate360-prod` / `hadnfcenpcfaeclczsmm`

| Column | State |
|---|---|
| `proxy_key` | present, HouseWalk object exists in R2 |
| `poster_key` | present (MASTER still) |
| `public_proxy_key` | present, baked object exists in R2 |
| `client_poster_key` | **missing** (`42703`) |
| `public_poster_key` | **missing** (`42703`) |
| `poster_meta` | **missing** (`42703`) |

## Why apply failed from this machine

| Tool | Result | Missing piece |
|---|---|---|
| Service-role REST | SELECT works | Cannot `ALTER TABLE` |
| Management API `/database/query` | **401** `{ message: Unauthorized }` | `SUPABASE_ACCESS_TOKEN` (`sbp_…`, 44 chars) is stale; no `~/.supabase/access-token` |
| `npx supabase db query --linked` | **401** `LegacyDbConfigLoginRole` | CLI is linked to `hadnfcenpcfaeclczsmm` via `C:\s360\supabase\.temp` but login role is unauthorized |
| Service-role `rpc exec_sql` | **PGRST202** | Function does not exist — service role cannot ALTER |
| Vercel production env | `POSTGRES_URL` **empty**, `POSTGRES_PASSWORD` **empty** | Host/user exist (`POSTGRES_HOST` / `POSTGRES_USER`) but password was never stored |

## Minimum repair (one-time, Brian or operator)

1. Supabase Dashboard → Account → Access Tokens → mint a new token with project access
2. Store it as `SUPABASE_ACCESS_TOKEN` in Vercel production **and** `.env.local` (replace the 401 token)
3. **Or** copy the database password from Supabase → Project Settings → Database into `POSTGRES_PASSWORD` / `POSTGRES_URL` in Vercel
4. Then run:

```bash
npx supabase db query --linked -f supabase/migrations/20260902120000_spatial_derivative_posters.sql
```

Until that lands, CLIENT/PUBLIC posters are stored in `spatial_clips.capture_meta.client_poster_key` / `public_poster_key` (HouseWalk seeded 2026-09-02). Media routes read those keys. MASTER `poster_key` is not used for shares.
