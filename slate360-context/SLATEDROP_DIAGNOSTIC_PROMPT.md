# Slate360 Diagnostic Prompt for AI Assistants

> **Purpose**: Share this prompt with another AI coding assistant (Claude, ChatGPT, Gemini, etc.) so they can diagnose and fix outstanding issues across the Slate360 platform. This documents root causes found, all attempted fixes, the tech stack, database schema, current solutions, and remaining problems. Three systems need help: **SlateDrop** (file management), **Dashboard** (widgets/layout), and **Market Robot** (Polymarket trading bot).
>
> **What we need**: Actual working code fixes. Every attempted fix so far has either been incomplete (stub UI with no backend) or addressed the wrong layer. The codebase compiles and the UI renders beautifully — but core functionality is missing or broken behind the scenes.

---

## The Problem (Overview)

Slate360 is a Next.js 15 SaaS platform with multiple modules. The UI across all modules renders beautifully, but **core functionality is broken or missing** behind the scenes. Three main areas need fixes:

### A. SlateDrop (File Management)
- **Upload now works** (after RLS bypass fix — details below)
- **Secure Send** shows a "success" modal but the modal never auto-closes and the file doesn't actually send for demo files or folders
- **Move** is completely unimplemented — just shows a toast "Move workflow is not enabled yet"
- **Preview** modal exists but never fetches real file content — always shows "Preview not available" for uploaded files
- **Copy** only copies the file *name* to the OS clipboard — no file-manager-style copy operation
- **Paste** does not exist anywhere in the UI or code

### B. Dashboard
- **Widgets are non-functional** — 9 of 11 widgets use hardcoded demo data with no real API calls
- **Quick access section** — user reports it still appears on non-overview tabs despite previous fixes (it IS correctly gated to overview in current code, but user perception suggests the tab nav bar or something else creates the appearance of redundancy)

### C. Market Robot (Polymarket Trading Bot)
- **Searches produce no results** for most keywords (server strips search param, client filters top 80 results only)
- **No timeframe sort** for Polymarket opportunities (end_date is fetched and displayed but not sortable)
- **Paper wallet doesn't work** — bot scan always returns "Bot is stopped" (400), paper trade PNL frozen at $0, no mark-to-market
- **Missing overview section** for tracking gains, losses, and wallet data over time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Auth | Supabase Auth (server-side via `@supabase/ssr` cookie-based client) |
| Database | Supabase PostgreSQL (PostgREST API) with **Row Level Security (RLS) enabled** |
| Storage | AWS S3 (`@aws-sdk/client-s3`, presigned URLs via `@aws-sdk/s3-request-presigner`) |
| Frontend | React 18, Tailwind CSS, Lucide icons |
| Relevant files | 8 API routes under `app/api/slatedrop/`, frontend in `components/slatedrop/SlateDropClient.tsx` |

---

## Database Schema (from Supabase OpenAPI)

### `slatedrop_uploads` (0 rows — nothing has ever been inserted successfully)

| Column | Type | Required | Notes |
|---|---|---|---|
| id | uuid | auto-generated PK | `gen_random_uuid()` default |
| project_id | uuid | nullable | |
| folder_id | uuid | nullable | FK — **NOT used in current code** |
| org_id | uuid | nullable | Organization scope |
| file_name | text | **REQUIRED** | |
| file_size | bigint | nullable | | 
| file_type | text | nullable | extension like "pdf", "jpg" |
| s3_key | text | nullable | Full S3 path like `orgs/{ns}/{folder}/{ts}_{name}` |
| status | text | nullable | "pending" → "active" → "deleted" |
| uploaded_by | uuid | nullable | `auth.uid()` of uploader |
| created_at | timestamptz | auto | |

### `slate_drop_links` (share links)

| Column | Type | Required |
|---|---|---|
| id | uuid | auto PK |
| file_id | uuid | nullable FK → slatedrop_uploads |
| token | text | **REQUIRED** |
| role | text | nullable ("view", "download") |
| created_by | uuid | nullable |
| expires_at | timestamptz | nullable |
| org_id | uuid | nullable |
| view_count | int | nullable |

### `file_folders` (50+ rows — real folder metadata)
| Column | Type | Notes |
|---|---|---|
| id | uuid | Auto PK |
| name | text | "General", "Design Studio", etc. |
| path | text | "/general", "/design-studio", etc. |
| scope | text | "project" |
| is_system_folder | boolean | |
| org_id | uuid | |

### `organization_members`
| Column | Type |
|---|---|
| org_id | uuid |
| user_id | uuid |
| role | text |

---

## Architecture: How Upload Works (3-step presigned URL flow)

1. **Frontend** (`SlateDropClient.tsx`) sends `POST /api/slatedrop/upload-url` with `{ filename, contentType, size, folderId: "general", folderPath: "general" }`
2. **API route** generates a presigned S3 PUT URL, inserts a `status: "pending"` record into `slatedrop_uploads`, returns `{ uploadUrl, fileId, s3Key }`
3. **Frontend** PUTs the file directly to S3 via the presigned URL
4. **Frontend** calls `POST /api/slatedrop/complete` with `{ fileId }` to mark the record `status: "active"`
5. **Frontend** calls `GET /api/slatedrop/files?folderId=general` to refresh the file list

---

## ROOT CAUSE FOUND (after extensive debugging)

### **Supabase Row Level Security (RLS) blocking all database operations**

The server-side Supabase client (`lib/supabase/server.ts`) creates a client using:
```typescript
import { createServerClient } from "@supabase/ssr";
createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // ← anon key
  { cookies: { getAll, setAll } }
);
```

This client respects RLS policies. When the API route does `supabase.from("slatedrop_uploads").insert(...)`, PostgREST enforces RLS.

**Proof of RLS blocking:**
```bash
# Insert with anon key (no JWT) — BLOCKED
curl -X POST "$SUPABASE_URL/rest/v1/slatedrop_uploads" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file_name":"test.txt","file_size":42,"file_type":"txt","s3_key":"orgs/test/general/test.txt","uploaded_by":"00000000-0000-0000-0000-000000000000","status":"pending"}'

# Response: HTTP 401
# {"code":"42501","message":"new row violates row-level security policy for table \"slatedrop_uploads\""}

# Insert with service_role key — SUCCEEDS
# Same request but with service_role key → HTTP 201, record created
```

**Even with an authenticated user JWT**, the RLS policy for `slatedrop_uploads` may require specific conditions (e.g., `uploaded_by = auth.uid()` AND `org_id` matches) that the cookie-based client doesn't satisfy, or the policy simply doesn't have an INSERT rule for the `authenticated` role.

We cannot query `pg_policies` or run arbitrary SQL because the Supabase project doesn't have an `exec_sql` or `run_sql` RPC function exposed.

---

## All Attempted Fixes (Chronological)

### Fix 1: Table Name Corrections
**Problem**: Routes were referencing non-existent tables `slatedrop_files` and `file_shares`.
**Fix**: Changed all routes to use `slatedrop_uploads` and `slate_drop_links`.
**Result**: ❌ Still 500. Table names were correct but RLS still blocked operations.

### Fix 2: Column Name Remapping
**Problem**: Columns like `name`, `size`, `type` don't exist. Real columns are `file_name`, `file_size`, `file_type`.
**Fix**: Remapped all column names across all 8 routes.
**Result**: ❌ Still 500. Column names were correct but RLS still blocked.

### Fix 3: folder_id UUID Type Mismatch
**Problem**: `folder_id` column is UUID type, but frontend sends text strings like `"general"`. PostgreSQL error: `22P02: invalid input syntax for type uuid: "general"`.
**Fix**: Removed `folder_id` from the insert payload entirely. Use `s3_key` prefix matching (`LIKE 'orgs/{ns}/{folderId}/%'`) for folder-based queries instead.
**Result**: ❌ Still 500. The UUID type error was fixed, but RLS was the real blocker all along.

### Fix 4 (THE ACTUAL FIX): Switch to Admin Client for DB Operations
**Problem**: The `createClient()` from `@/lib/supabase/server` uses the anon key and respects RLS. RLS on `slatedrop_uploads` blocks inserts/updates/selects.
**Fix**: Import `createAdminClient()` from `@/lib/supabase/admin` (which uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS) for all database operations. Still use the cookie-based client for `auth.getUser()` to verify the user is logged in.

```typescript
// Auth check — cookie-based client (anon key, verifies JWT from cookies)
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// DB operations — admin client (service role key, bypasses RLS)
const admin = createAdminClient();
const { data, error } = await admin.from("slatedrop_uploads").insert({...}).select("id").single();
```

**Result**: ✅ This should work because the service_role key bypasses all RLS policies.

---

## The 8 API Routes (all fixed)

| Route | Method | Purpose | DB Tables Used |
|---|---|---|---|
| `/api/slatedrop/upload-url` | POST | Generate presigned S3 URL + pending record | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/complete` | POST | Mark upload as active | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/files` | GET | List files in a folder (by s3_key prefix) | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/download` | GET | Get presigned download URL | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/rename` | PATCH | Rename a file | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/delete` | DELETE | Soft-delete + S3 cleanup | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/zip` | POST | Bundle folder as ZIP | `organization_members`, `slatedrop_uploads` |
| `/api/slatedrop/secure-send` | POST | Create share link + email | `organization_members`, `slatedrop_uploads`, `slate_drop_links` |

---

## Key Files

- `lib/supabase/server.ts` — Cookie-based client (anon key, respects RLS)
- `lib/supabase/admin.ts` — Service-role client (bypasses RLS)
- `lib/supabase/client.ts` — Browser client (anon key, for frontend)
- `lib/s3.ts` — S3 client, bucket config, `buildS3Key()` function
- `lib/entitlements.ts` — Tier-based feature gating
- `components/slatedrop/SlateDropClient.tsx` — Full frontend (1709 lines): folder tree, file grid, upload, context menus, modals
- `app/api/slatedrop/*/route.ts` — 8 API routes

---

## Environment Variables (server-side)

```
NEXT_PUBLIC_SUPABASE_URL=https://hadnfcenpcfaeclczsmm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (role: "anon")
SUPABASE_SERVICE_ROLE_KEY=eyJ... (role: "service_role")
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=VDZe...
SLATEDROP_S3_BUCKET=slate360-storage
```

---

## Questions for the Second AI Assistant

1. **RLS Policy Audit**: Can you help write SQL to check/fix the RLS policies on `slatedrop_uploads` and `slate_drop_links`? The ideal policy should allow authenticated users to INSERT where `uploaded_by = auth.uid()` and SELECT/UPDATE/DELETE where `uploaded_by = auth.uid() OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())`. This would let us use the cookie-based client (better security) instead of the admin client.

2. **Admin Client Security**: Using `createAdminClient()` (service_role key) in API routes bypasses RLS entirely. Is there a security concern? The auth check (`supabase.auth.getUser()`) still verifies the user's JWT, and the routes manually scope queries by `org_id` or `uploaded_by`. Is this acceptable?

3. **S3 Presigned URL Flow**: The presigned URL is generated with `ContentLength` set. If the browser sends a different content length, will S3 reject the PUT? Should we remove the `ContentLength` constraint?

4. **Future: Project Subfolder Auto-Filing**: Business/enterprise users should have files automatically sorted into project subfolders (e.g., when working in Design Studio on "Maple Heights", outputs go to `projects/maple-heights/design-studio/`). What's the best way to wire this into the `buildS3Key` function using the `file_folders` table?

---

## Alternative Fix: Add Proper RLS Policies (Preferred Long-Term)

Instead of using the admin client, the proper fix is to add correct RLS policies. Run this SQL in the Supabase SQL Editor:

```sql
-- Enable RLS (likely already enabled)
ALTER TABLE slatedrop_uploads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own records
CREATE POLICY "Users can insert own uploads"
  ON slatedrop_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Allow users to view their own uploads or org uploads
CREATE POLICY "Users can view own/org uploads"
  ON slatedrop_uploads
  FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Allow users to update their own uploads or org uploads
CREATE POLICY "Users can update own/org uploads"
  ON slatedrop_uploads
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
  ON slatedrop_uploads
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Similar for slate_drop_links
ALTER TABLE slate_drop_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own share links"
  ON slate_drop_links
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view own/org share links"
  ON slate_drop_links
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );
```

After running these policies, you could switch back from `createAdminClient()` to `createClient()` (the cookie-based client) for all DB operations, which is more secure because RLS provides an additional layer of protection.

---
---

# PART 2: NEW ISSUES DISCOVERED (After RLS Fix)

> The RLS bypass fix (Part 1 above) solved the upload 500 errors. Uploads now succeed. But many SlateDrop features are still broken, dashboard widgets are non-functional, and Market Robot has multiple issues. Below is a detailed breakdown of everything that was investigated and what's wrong.

---

## SlateDrop: Remaining Issues

### Issue S1: Secure Send Modal Never Auto-Closes

**File**: `components/slatedrop/SlateDropClient.tsx` lines ~1308–1393

**What happens**: User right-clicks a file → Secure Send → enters email → clicks "Send secure link" → API returns `{ ok: true }` → state `shareSent` flips to `true` → modal shows "Link sent!" success screen… and stays open forever.

**Root cause**: When `shareSent` becomes `true`, the modal renders a static success screen but **there is no `setTimeout` or callback to auto-close the modal** (i.e., call `setShareModal(null)`). The user must manually click the X button.

**Secondary issue**: `shareEmail` is never cleared when opening the modal for a new file, so the previous email is pre-filled.

**What needs to happen**:
1. After showing "Link sent!", auto-close the modal after ~2 seconds (`setTimeout(() => { setShareModal(null); setShareSent(false); setShareEmail(""); }, 2000)`)
2. Clear `shareEmail` when opening the modal

### Issue S2: Secure Send Fails for Folders and Demo Files

**What happens**: The Secure Send context menu appears for folders too (line ~1275), passing `contextMenu.target.id` (a folder ID like `"design-studio"`) as `fileId`. The API queries `slatedrop_uploads` for that ID and returns 404 because folder IDs don't exist in that table.

Similarly, demo files have hardcoded IDs like `"f1"`, `"f2"` which don't exist in the database either.

**What needs to happen**: Either hide "Secure Send" for folders/demo files, or implement folder sharing.

### Issue S3: Move Is Completely Unimplemented

**Files**: `components/slatedrop/SlateDropClient.tsx` lines ~1242 (files), ~1261 (folders)

**Current code**: Both handlers just call `showToast("Move workflow is not enabled yet", false)`.

**What's missing**:
- No move modal / folder picker UI
- No API route (`/api/slatedrop/move` doesn't exist)
- No S3 copy+delete logic

**What needs to happen**:
1. Create a folder-picker modal that shows the folder tree
2. Create `app/api/slatedrop/move/route.ts` that:
   - Updates the `s3_key` in `slatedrop_uploads` (new prefix for the target folder)
   - Copies the S3 object to the new key and deletes the old one (S3 doesn't support rename natively)
3. Wire the frontend to call the API and refresh the file list

### Issue S4: Preview Never Loads Real File Content

**File**: `components/slatedrop/SlateDropClient.tsx` lines ~1599–1651

**Current behavior**: The preview modal checks `file.thumbnail` — if it exists, renders an `<img>` tag. Otherwise shows "Preview not available — Download the file to view it locally."

**Root cause**: Real uploaded files don't have a `thumbnail` property set. The modal **never calls any API to get a presigned download URL** for rendering. The existing download API (`/api/slatedrop/download`) already generates presigned URLs, but the preview modal doesn't use it.

**What needs to happen**:
1. When `previewFile` is set, call `/api/slatedrop/download?id={fileId}` to get a presigned URL
2. Render based on file type:
   - Images (jpg, png, gif, webp, svg): `<img src={presignedUrl}>`
   - PDF: `<iframe src={presignedUrl}>`
   - Text/code: fetch the content and render in a `<pre>` block
   - 3D models (obj, stl, fbx): show a download prompt or embed a viewer
   - Other: show "Preview not available" with a download button

### Issue S5: Copy Only Copies File Name, No Paste

**Current behavior**: "Copy" context menu item calls `navigator.clipboard.writeText(file.name)` — it copies the **file name as text**, not the file itself.

**What's missing**:
- No `clipboardFiles` state to track copied files
- No "Paste" context menu item
- No API to duplicate a file in S3/database

**What needs to happen**:
1. Add `clipboardFiles` state: `{ files: FileItem[], sourceFolder: string, operation: "copy" | "cut" }`
2. "Copy" sets this state instead of copying the name
3. "Cut" (Move) sets this state with `operation: "cut"`
4. "Paste" appears in folder context menu when clipboard has items
5. "Paste" calls an API to copy the S3 object and create a new DB record (for copy) or update the key (for cut/move)

---

## Dashboard: Remaining Issues

### Issue D1: Widgets Use Hardcoded Demo Data

**File**: `components/dashboard/DashboardClient.tsx`

**Widget inventory**:

| Widget | Status | Problem |
|--------|--------|---------|
| `slatedrop` | Static | Shows hardcoded files ("Welcome to SlateDrop.pdf"), hardcoded storage bar |
| `data-usage` | **Partial** | Credits/storage bars use hardcoded values (`creditsUsed = 1847`). Billing buttons ARE wired to real APIs. |
| `processing` | Static | Renders `demoJobs` — entirely hardcoded, no API to fetch real processing jobs |
| `financial` | Static | Renders `demoFinancial` — hardcoded bar chart, no real financial data |
| `calendar` | Local only | Events come from `demoEvents`, user can add events but they only persist in React state — no backend |
| `weather` | Static | Renders `demoWeather`, "Log to Daily Report" flips a boolean with no API call |
| `continue` | Static | Renders `demoContinueWorking` (hardcoded), links go to `/dashboard` |
| `contacts` | Static | Renders `demoContacts`, search works locally, "Add" button has no handler |
| `suggest` | **Working** | Fully wired — `POST /api/suggest-feature` works |
| `seats` | Static | Shows `demoSeatMembers`, "Invite member" has no handler |
| `upgrade` | **Working** | Static CTA card linking to `/plans` |

**What needs to happen**: Each widget needs to fetch real data from its respective API/module. At minimum:
- `slatedrop` widget: Call `/api/slatedrop/files` for recent files, compute real storage usage
- `data-usage`: Fetch actual credit usage from Supabase
- `processing`: Create an API for processing job status, or hide the widget until the module exists
- `calendar`: Persist events to Supabase `user_events` table (or similar)
- `contacts`: Pull from `organization_members` or a `contacts` table

### Issue D2: Quick Access Section Perception

**Current code state**: The quick-access tiles section IS correctly gated to `activeTab === "overview"` (line ~1091). It should NOT appear on other tabs.

**User reports**: "the dashboard tabs all still have that quick access section taking up space." This may be because:
1. The **tab navigation bar** (the horizontal icon row for switching between modules) appears on non-overview tabs and may look visually similar to the "quick access" tiles
2. The tab nav bar was previously hidden on overview to avoid duplication — the condition is `activeTab !== "overview"` at line ~1007

**What to investigate**: Check if the tab nav bar styling is being confused with quick-access tiles. The user may want the tab nav to be more compact or visually distinct from the tile grid.

---

## Market Robot: All Issues

### Key Files
- `components/dashboard/MarketClient.tsx` — 2,264-line monolithic client component
- `lib/market-bot.ts` — 333-line server-side bot brain (scoring, trade decisions, simulation)
- `app/api/market/polymarket/route.ts` — CORS proxy to Gamma API
- `app/api/market/scan/route.ts` — Bot scan endpoint
- `app/api/market/buy/route.ts` — Direct buy (paper or live)
- `app/api/market/trades/route.ts` — Trade history
- `app/api/market/whales/route.ts` — Whale activity proxy
- `app/api/market/wallet-connect/route.ts` — MetaMask wallet linking

### Issue M1: Searches Produce No Results

**Root cause**: Server-client keyword filtering mismatch.

1. Client sends keyword as `_q` param:
   ```ts
   if (kw.trim()) params.set("_q", kw.trim());
   ```
2. The proxy at `polymarket/route.ts` **explicitly strips** `_q` before forwarding to the Gamma API:
   ```ts
   forwardParams.delete("_q");
   ```
3. The Gamma API doesn't receive any search parameter — it returns **~80 markets sorted by `volume24hr`**
4. Client then filters the returned results by keyword **client-side**:
   ```ts
   .filter((m) => {
     if (!kw.trim()) return true;
     const title = String(m.question || m.title || "").toLowerCase();
     const cat = String(m.category || "").toLowerCase();
     return title.includes(kw.toLowerCase()) || cat.includes(kw.toLowerCase());
   })
   ```
5. If the search term doesn't appear in the top 80 volume results, the user sees **zero matches**.

**The Gamma API supports a `tag` parameter** for category filtering, but it's never used. There's no text search endpoint in the Gamma API — the correct approach is:
1. Increase the `limit` parameter significantly (e.g., 500-1000)
2. Use the `tag` param for category-based filtering
3. Pass `closed=false` to only get active markets
4. Consider caching results server-side

### Issue M2: No Timeframe Sort for Polymarket Opportunities

**Current sort options** (MarketClient.tsx line ~1545):
```tsx
<option value="volume">24h Volume ↓</option>
<option value="edge">Edge % ↓</option>
<option value="probability">Probability ↓</option>
<option value="title">Title A→Z</option>
```

**Missing**: `end_date` is fetched and rendered in the market table but **there is no sort-by-timeframe option**. The `mktSortBy` state type restricts to `"volume" | "edge" | "probability" | "title"`.

**What needs to happen**:
1. Add `"endDate"` to the `mktSortBy` type union
2. Add `<option value="endDate">End Date ↑</option>` to the dropdown
3. Add sorting case in `filteredMarkets`:
   ```ts
   case "endDate":
     return new Date(a.end_date_iso || a.end_date || 0).getTime() -
            new Date(b.end_date_iso || b.end_date || 0).getTime();
   ```
4. Consider adding timeframe filter presets: "Ending this week", "Ending this month", "Ending in 3+ months"

### Issue M3: Paper Wallet / Bot Scan Is Non-Functional

**Multiple interrelated problems:**

#### M3a: Bot Scan Always Returns "Bot is stopped" (400)
The scan route at `app/api/market/scan/route.ts` reads bot config from `user.user_metadata?.marketBotConfig`, which defaults to `botStatus: "stopped"`. The client sets `botRunning` in local React state but **never updates `user_metadata.marketBotConfig.botStatus`** on the server. So the scan API always sees `"stopped"` and rejects the request.

**Fix**: When the user toggles the bot on/off in the UI, save `botStatus` to `user_metadata` via Supabase `auth.updateUser()`.

#### M3b: Paper Trade PNL Is Frozen at $0
The buy route at `app/api/market/buy/route.ts` sets `pnl: 0` and `current_price: avg_price` on creation. There is **no mechanism to update paper trade PNL** over time — no background job, no cron, no mark-to-market recalculation. Paper trades are created and then frozen forever.

**Fix**: Either:
- Add a `/api/market/mark-to-market` endpoint that fetches current prices from Polymarket and updates `current_price`/`pnl` for open trades
- Or recalculate PNL on-the-fly when fetching trades (compare `avg_price` to live price from Polymarket API)

#### M3c: Live CLOB Trading Is Commented Out
In `app/api/market/buy/route.ts` lines ~160-185, the CLOB order submission code is entirely commented out. When CLOB credentials aren't set, it falls back to paper mode. When they are set, it returns `501 Not Implemented`.

#### M3d: Direct Buy Column Mismatch
The buy route uses columns `market_title`, `outcome`, `current_price` while the trades route uses `question`, `side`, `price`. Both insert into the same `market_trades` table with different column names, which may cause data inconsistency.

### Issue M4: Missing Overview Section for Gains/Losses/Wallet Data

**Current Dashboard tab has**:
- 4 stat cards (Total PNL, Open Positions, Win Rate, Total Trades) — all show `$0.00` / `0%` because PNL is never updated
- A Cumulative PNL chart — always flat at $0
- A Wallet section showing MetaMask address, USDC/MATIC balances
- An Activity Log
- Open Positions table

**What's missing**:
- **No portfolio overview/summary**: No aggregated view of total invested vs current portfolio value vs unrealized gains/losses
- **No historical wallet tracking**: Just a snapshot of current USDC/MATIC balances — no tracking over time
- **No daily/weekly/monthly P&L breakdown**: The API returns `dailyPnl` and `dailyVolume` from the trades endpoint, but these are **never displayed in the UI**
- **No gains/losses detail section**: Need a clear section showing: total gains, total losses, net P&L, best trade, worst trade, ROI %
- **No wallet activity history**: No deposit/withdrawal tracking

**What needs to happen**:
1. Add a "Portfolio Overview" card or section to the Market Robot Dashboard tab with:
   - Total invested (sum of all buy amounts)
   - Current portfolio value (sum of current_price × shares for open positions)
   - Unrealized P&L (current value - invested)
   - Realized P&L (from closed positions)
   - ROI % (total P&L / total invested)
   - Best/worst trade stats
2. Display `dailyPnl` and `dailyVolume` data that the API already returns
3. Add a time-series chart of portfolio value (requires persisting snapshots — add a daily cron or compute from trade history)
4. Wire the PNL stat cards to real data once mark-to-market is implemented

---

## Summary Table of All Issues

| ID | Module | Feature | Status | Severity |
|----|--------|---------|--------|----------|
| S1 | SlateDrop | Secure Send modal doesn't auto-close | Broken UX | Medium |
| S2 | SlateDrop | Secure Send fails for folders/demo files | Broken | Medium |
| S3 | SlateDrop | Move is unimplemented | Stub only | High |
| S4 | SlateDrop | Preview never loads real content | Stub only | High |
| S5 | SlateDrop | Copy/Paste is fake | Stub/Missing | Medium |
| D1 | Dashboard | 9/11 widgets use hardcoded demo data | No backend | High |
| D2 | Dashboard | Quick access perception issue | Investigate | Low |
| M1 | Market Robot | Searches produce no results | Broken | High |
| M2 | Market Robot | No timeframe sort | Missing feature | Medium |
| M3a | Market Robot | Bot scan always "stopped" | Broken | Critical |
| M3b | Market Robot | Paper trade PNL frozen at $0 | Broken | Critical |
| M3c | Market Robot | Live CLOB trading commented out | Not implemented | High |
| M3d | Market Robot | Buy/trades column mismatch | Data issue | Medium |
| M4 | Market Robot | No gains/losses/wallet overview | Missing feature | High |

---

## What Has Already Been Tried (Full History)

### SlateDrop Fixes (Chronological)
1. **Table name corrections**: Changed `slatedrop_files`→`slatedrop_uploads`, `file_shares`→`slate_drop_links` (was necessary but didn't fix the 500s)
2. **Column name remapping**: Changed `name`→`file_name`, `size`→`file_size`, `type`→`file_type` (was necessary but didn't fix the 500s)
3. **folder_id UUID type mismatch**: Removed `folder_id` from inserts (it's UUID type but frontend sends text like "general"). Now uses s3_key prefix matching instead. (Was necessary but didn't fix the 500s)
4. **RLS bypass via admin client** ✅: THE fix that made uploads work. Switched all 8 API routes from `createClient()` (anon key, respects RLS) to `createAdminClient()` (service_role key, bypasses RLS). Auth still verified via cookie-based client.
5. **Current state**: Uploads work, but Secure Send/Move/Preview/Copy are still broken as described above.

### Dashboard Fixes (Chronological)
1. **Hid tab nav bar on overview**: Added `activeTab !== "overview"` condition to the nav bar so it doesn't duplicate the quick-access tiles
2. **Added all tabs to quick-access tiles**: My Account, CEO-only tabs (Market Robot, CEO, Athlete360) now appear as tiles
3. **Adaptive tile sizing**: Tiles scale to fit in one row (up to 12+)
4. **Current state**: Tiles are correctly gated to overview only. But widgets are still all demo data and the user still perceives a redundant quick-access area.

### Market Robot Fixes
*No fixes have been attempted yet.* All issues are freshly discovered.

---

## Key Technical Patterns to Understand

### Auth Pattern (used everywhere)
```typescript
// Cookie-based client — verifies user JWT, respects RLS
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// Admin client — bypasses RLS, used for DB operations
import { createAdminClient } from "@/lib/supabase/admin";
const admin = createAdminClient();
```

### S3 Key Structure
```
orgs/{orgId}/{folderId}/{timestamp}_{sanitized_filename}
```
Example: `orgs/abc123/general/1740000000000_report.pdf`

### Frontend Architecture
- All modules render inside `DashboardClient.tsx` via `activeTab` state
- Each module can also have a standalone page (e.g., `/market` → `MarketClient`)
- Modules: SlateDrop, Design Studio, Project Hub, Market Robot, CEO, Athlete360, My Account

### Supabase Tables Summary
| Table | Has RLS | Used By |
|-------|---------|---------|
| `slatedrop_uploads` | YES (blocks anon) | SlateDrop |
| `slate_drop_links` | YES | SlateDrop Secure Send |
| `file_folders` | Unknown | SlateDrop folder metadata |
| `organization_members` | Unknown | Org scoping across modules |
| `market_trades` | Unknown | Market Robot paper trades |
| `profiles` / `user_metadata` | N/A (auth) | User preferences, bot config |
