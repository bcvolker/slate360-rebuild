# Code-only Request — Credit Meter + Beta Banner + /app Mobile Shell

> No repo access required. Reply with code blocks only — the orchestrator wires it in.
> Pause after each section ("READY FOR REVIEW: SECTION X") so the orchestrator can integrate before you continue.

## Stack & Conventions
- Next.js 15 App Router, TypeScript strict, Tailwind, shadcn/ui primitives.
- No `any`. No file > 300 lines. One component per file.
- Brand colors: cobalt = `#3B82F6` (Tailwind classes `bg-cobalt`, `text-cobalt`, `border-cobalt`). Dashboard surfaces are dark (zinc-950 bg).
- Server fetches use Supabase admin client when crossing tenant boundaries.

## Helpers and primitives you can assume exist (no need to redefine)
```ts
// lib/beta-mode.ts
export const BETA_MODE: boolean;
export const BETA_TESTER_CAP: 100;
export function isBetaMode(): boolean;
export const BETA_DISABLED_LABELS: {
  subscribe: "Subscribing opens at launch";
  upgrade: "Upgrade unlocks at launch";
  buyCredits: "Credit packs unlock at launch";
  addCollaborator: "Add seats at launch";
};
```

```ts
// lib/server/api-auth.ts
import type { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthedContext = {
  req: NextRequest;
  user: User;
  admin: SupabaseClient;        // service-role admin client
  orgId: string | null;         // resolved org for the user (may be null)
};

export function withAuth(
  req: NextRequest,
  handler: (ctx: AuthedContext) => Promise<NextResponse>
): Promise<NextResponse>;
```

```ts
// lib/server/api-response.ts — return only via these:
export function ok<T>(data: T): NextResponse;
export function created<T>(data: T): NextResponse;
export function noContent(): NextResponse;
export function badRequest(msg?: string): NextResponse;
export function unauthorized(msg?: string): NextResponse;
export function forbidden(msg?: string): NextResponse;     // string only
export function notFound(msg?: string): NextResponse;
export function conflict(msg?: string): NextResponse;
export function serverError(msg?: string): NextResponse;
```

```ts
// lib/server/org-context.ts (server, cached per request)
export async function resolveServerOrgContext(): Promise<{
  user: User | null;
  orgId: string | null;
  orgName: string | null;
  tier: "trial" | "creator" | "model" | "business" | "enterprise";
  isBetaApproved: boolean;
  isSlateCeo: boolean;
  canAccessOperationsConsole: boolean;
  hasOperationsConsoleAccess: boolean;
  isViewer: boolean;
  isAdmin: boolean;
}>;
```

```ts
// lib/billing/cost-model.ts
export const BETA_LIMITS = {
  storageGb: 10,
  renders: 20,
  credits: 500,
  collaborators: 3,
} as const;
```

```tsx
// components/shared/SlateLogo.tsx
export function SlateLogo(props: {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";   // default "light" (white text); use "dark" on light bg
  className?: string;
}): JSX.Element;
```

UI primitives (shadcn/ui already installed):
```ts
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
```

Profile fields available in DB (`profiles` table):
```
id uuid PK = auth.users.id
beta_tester boolean
foundational_member boolean
beta_joined_at timestamptz
foundational_granted_at timestamptz
```

---

## SECTION A — Credit Meter (topbar pill + slide-out ledger)

### A1. Server helper — `lib/credits/get-balance.ts`
```ts
// SCHEMA REFERENCE (already in DB, do not redefine):
//   table credit_balance (
//     org_id uuid PK,
//     balance_credits bigint NOT NULL DEFAULT 0,
//     monthly_allowance bigint NOT NULL DEFAULT 0,
//     last_reset_at timestamptz NOT NULL DEFAULT now(),
//     updated_at timestamptz NOT NULL DEFAULT now()
//   )
```
Implement `getCreditBalance(orgId: string | null): Promise<{ balance: number; limit: number }>`.
- If `orgId` is null → return `{ balance: 0, limit: 0 }`.
- Use `createAdminClient()` from `@/lib/supabase/admin`.
- Read `balance_credits` and `monthly_allowance` from `credit_balance` for that `org_id`.
- If no row exists → return `{ balance: 0, limit: BETA_LIMITS.credits }` so beta users with no provisioned row still see "0 / 500".
- Final `limit` = `Math.max(monthly_allowance, BETA_LIMITS.credits)` if `isBetaMode()` else `monthly_allowance`.

### A2. Server helper — `lib/credits/get-ledger.ts`
```ts
// SCHEMA REFERENCE:
//   table credit_ledger (
//     id uuid PK,
//     organization_id uuid NOT NULL,
//     delta numeric(12,2) NOT NULL,
//     running_balance numeric(12,2),
//     reason text NOT NULL,
//     category text NOT NULL,    -- enum: subscription | purchase | bonus | refund | job_usage | storage_usage | bandwidth_usage | export_usage | api_usage | adjustment | expiration
//     ref_type text,
//     ref_id uuid,
//     metadata jsonb,
//     created_by uuid,
//     created_at timestamptz DEFAULT now()
//   )
```
Implement `getCreditLedger(orgId: string | null, limit = 20): Promise<LedgerEntry[]>` where:
```ts
export type LedgerEntry = {
  id: string;
  delta: number;
  runningBalance: number | null;
  reason: string;
  category: string;
  createdAt: string;  // ISO
};
```
- Order by `created_at desc` limit `limit`.
- Map fields to camelCase. `delta` and `running_balance` come back as strings from numeric; coerce via `Number()`.

### A3. API routes — `app/api/credits/balance/route.ts` and `app/api/credits/ledger/route.ts`
Both use `withAuth(req, async (ctx) => …)`, return via `ok(...)`.
- `GET /api/credits/balance` → returns `await getCreditBalance(ctx.orgId)`.
- `GET /api/credits/ledger?limit=20` → returns `await getCreditLedger(ctx.orgId, Number(searchParams.get('limit') ?? 20))`. Cap `limit` to 100.

### A4. Client `components/dashboard/credits/CreditMeter.tsx` (~80 lines)
- `"use client"` component, no props.
- On mount, `fetch('/api/credits/balance')` → `setState({ balance, limit })`.
- Render a `<Sheet>` from shadcn:
  - Trigger: pill button with class `hidden lg:flex items-center gap-2 px-3 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm text-zinc-300`. Content: lightning bolt icon (use `lucide-react` `Zap`) + `{balance.toLocaleString()} / {limit.toLocaleString()}` + small "credits" label.
  - SheetContent side="right", inside renders `<CreditLedgerList />`.
- While loading, show "🔋 — / —".

### A5. Client `components/dashboard/credits/CreditLedgerList.tsx` (~80 lines)
- `"use client"`.
- On mount, `fetch('/api/credits/ledger?limit=20')` → setState with the array.
- Render header "Recent activity" + a table with columns: When (relative time, use `Intl.RelativeTimeFormat`), What (capitalized category), Amount (signed delta with `text-emerald-400` for positive, `text-rose-400` for negative), Balance.
- If empty array → render an empty-state card "No credit activity yet."

You do NOT need to wire CreditMeter into the topbar — orchestrator will do that.

**END SECTION A — pause and emit "READY FOR REVIEW: SECTION A".**

---

## SECTION B — Beta Banner

### B1. Client `components/beta/BetaBanner.tsx` (~60 lines)
Props:
```ts
interface BetaBannerProps {
  isBetaTester: boolean;
}
```
Behavior:
- `"use client"`.
- Renders `null` if `!isBetaTester` OR if `!isBetaMode()` OR if `sessionStorage.getItem('slate360.betabanner.dismissed') === '1'`.
- On mount, read sessionStorage and call `setDismissed(true)` if present.
- Render: a single horizontal strip with `bg-cobalt/10 border-y border-cobalt/30 text-sm text-zinc-100` and `px-4 py-2.5`. Inside (flex row with gap-3, items-center, justify-between):
  - Left span: rocket emoji + `<span>You're a Beta Founder — your usage is free. Foundational pricing locks in when subscriptions open.</span>`
  - Right cluster: a "Send feedback" button (`<Button variant="ghost" size="sm" className="text-cobalt hover:text-cobalt hover:bg-cobalt/20">`) with an `onClick` placeholder that just `console.log('TODO: open BetaFeedbackModal')` — orchestrator will wire later — AND an X close button that sets `sessionStorage.setItem('slate360.betabanner.dismissed', '1')` and `setDismissed(true)`.
- Use `import { Rocket, X } from "lucide-react"`.

### B2. Server helper — `lib/beta/get-beta-status.ts`
Implement `getBetaStatus(userId: string): Promise<{ isBetaTester: boolean; isFoundationalMember: boolean }>`.
- Use `createAdminClient()`.
- `select('beta_tester, foundational_member').from('profiles').eq('id', userId).single()`.
- On any error or null → return both `false`.

You do NOT need to wire BetaBanner into the AppShell — orchestrator will do that.

**END SECTION B — pause and emit "READY FOR REVIEW: SECTION B".**

---

## SECTION C — `/app` Mobile Shell (separately previewable surface)

Goal: visiting `https://www.slate360.ai/app` from a desktop browser shows the mobile-app design in a centered phone-width column so the user can iterate the mobile UX separately from the marketing site and the desktop dashboard. When installed as a PWA, it opens here directly.

### C1. `app/(app)/layout.tsx` — server component
```tsx
// pseudocode shape — produce real code

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { MobileAppShell } from "@/components/app/MobileAppShell";
import { getBetaStatus } from "@/lib/beta/get-beta-status";

export const metadata = {
  title: "Slate360 — App",
  viewport: { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false },
};

export default async function AppRouteLayout({ children }: { children: ReactNode }) {
  const { user } = await resolveServerOrgContext();
  if (!user) redirect("/login?next=/app");
  const status = await getBetaStatus(user.id);
  const userName =
    (user.user_metadata?.name as string | undefined) ?? user.email ?? "";
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex justify-center">
      <div className="w-full max-w-md min-h-dvh flex flex-col border-x border-zinc-900 relative">
        <MobileAppShell userName={userName} isBetaTester={status.isBetaTester}>
          {children}
        </MobileAppShell>
      </div>
    </div>
  );
}
```

### C2. `components/app/MobileAppShell.tsx` (~150 lines, client)
Props:
```ts
interface MobileAppShellProps {
  userName: string;
  isBetaTester: boolean;
  children: React.ReactNode;
}
```
- Sticky top bar (h-14, bg-zinc-950/95, backdrop-blur, border-b border-zinc-900): `<SlateLogo variant="light" size="sm" />` left + page title (read from `usePathname()` and map: `/app` → "Home", `/app/projects` → "Projects", `/app/apps` → "Apps", `/app/captures` → "Capture", `/app/inbox` → "Inbox", `/app/account` → "Account") center + bell icon (`Bell` from lucide) right.
- Children render in a scrollable area: `<main className="flex-1 overflow-y-auto pb-20 px-4 py-4">{children}</main>`.
- Sticky bottom nav (fixed inside the centered column, h-16, bg-zinc-950/95, backdrop-blur, border-t border-zinc-900) with 5 equal-width tab buttons:
  - Projects (`FolderKanban`, href `/app/projects`)
  - Apps (`Grid3x3`, href `/app/apps`)
  - Capture (`Camera`, href `/app/captures`) — render with cobalt accent and slightly larger to feel like the primary action
  - Inbox (`Inbox`, href `/app/inbox`)
  - Account (`User`, href `/app/account`)
  - Active tab: `text-cobalt`, inactive: `text-zinc-500`. Compute active via `usePathname().startsWith(href)`.
- Use `next/link` for nav.

### C3. Pages (each ~60 lines, client where necessary, otherwise server)

**`app/(app)/app/page.tsx`** — Home/landing
- Greeting "Good {morning|afternoon|evening}, {firstName}." (compute from local time).
- If `isBetaTester` (fetch via `getBetaStatus` server-side and pass through page props or just call again), small cobalt badge "Beta Founder".
- Section "Quick capture" — 4 large square tile buttons (2-col grid): Camera, 360 Camera, Voice Note, Upload File. Each is a `<Link href="/app/captures">` for now (placeholder).
- Section "Pinned Projects" — heading + horizontal scroller. Source: empty array fallback for now (TODO comment: replace with `lib/projects/get-pinned.ts`). Empty state card "No pinned projects yet — pin one from the desktop dashboard."

**`app/(app)/app/projects/page.tsx`** — list of user's projects
- Server component. Use `createServerSupabaseClient` from `@/lib/supabase/server` to query `projects` table (columns `id, name, status, updated_at`) where `created_by = user.id` order by `updated_at desc` limit 50.
- Render mobile cards (rounded-xl, bg-zinc-900, border border-zinc-800, p-4 mb-3) with project name + status badge.
- Empty state: "No projects yet. Create your first one from the desktop dashboard."

**`app/(app)/app/apps/page.tsx`** — 4 large app tiles
- Site Walk (live, link to `/site-walk`).
- 360 Tours / Design Studio / Content Studio (gray with cobalt "Coming Soon" badge, no link).
- Each tile: icon + name + 1-line description.

**`app/(app)/app/captures/page.tsx`**
- 4 capture launcher tiles (2x2 grid): Camera, 360 Camera, Voice Note, Upload File.
- Each `onClick` shows a `toast.info('Capture flow ships in the next round')` (use `sonner` if available, else a simple inline div).
- Below: "Recent captures" empty state for now.

**`app/(app)/app/inbox/page.tsx`**
- Empty-state card "No notifications yet. Comments and replies on shared walks will appear here."

**`app/(app)/app/account/page.tsx`**
- Server component. Fetch user via `resolveServerOrgContext()`.
- Render: name, email, "Beta Founder" cobalt badge if applicable, current tier, and a Sign Out button. The Sign Out button must be a client child component that calls `await createClient().auth.signOut(); router.push('/')`.

### C4. PWA manifest update — `app/manifest.ts`
You don't have the current manifest contents. Output a complete replacement that:
- Sets `name: "Slate360"`, `short_name: "Slate360"`.
- Sets `start_url: "/app"`, `scope: "/app"`, `display: "standalone"`, `background_color: "#09090b"`, `theme_color: "#3B82F6"`.
- Uses icons at `/icons/icon-192.png` and `/icons/icon-512.png` (assume they exist; orchestrator will fix paths if needed).
- Exports `default function manifest(): MetadataRoute.Manifest`.

### C5. Hook — `lib/hooks/useIsStandalone.ts` (~25 lines, client)
Returns `boolean` based on `window.matchMedia('(display-mode: standalone)').matches`. Reactive to media-query change events. Returns `false` during SSR.

**END SECTION C — emit "READY FOR REVIEW: SECTION C" then end with:**
"ALL SECTIONS COMPLETE. <N> files. Awaiting orchestrator integration."

---

## Output format
For EACH file, emit a single fenced code block with a header comment indicating the path:
```tsx
// FILE: components/dashboard/credits/CreditMeter.tsx
"use client";
... full file contents ...
```
Do NOT abbreviate with `...existing code...`. Every file must be complete and ready to drop in.
