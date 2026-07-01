# Unified Shell Migration Strategy
## Phase 3: Route/Mount Implementation (Tailwind v4 + Next.js App Router)

**Current State:**
- ✅ PRODUCTION: `dashboard-desktop/` — clean tokens, real routes, mounted at `app/(dashboard)/layout.tsx`
- ❌ DEAD: `dashboard-v3/` — hardcoded hex, `#` hrefs, never mounted (delete)
- ✅ BUILT: `shell-tokens.ts`, `AppSwitcher`, `--app-accent` CSS var, `/preview/unified-shell`

**Goal:** Wire unified shell into production with zero downtime, minimal risk.

---

## Decision: Incremental Route Takeover (Option B Variant)

Don't refactor `dashboard-desktop` in place (high blast radius). Don't build parallel `UnifiedAppShell` (duplication). Instead:

```
1. Build UnifiedAppShell components (new directory)
2. Mount alongside existing layout with route-based feature flag
3. Migrate route-by-route (Dashboard → Site Walk → Twin 360 → Shared)
4. Delete dashboard-desktop only after 100% migration + 1 week stability
```

---

## 1. Directory Structure

```
components/
├── shell-unified/                    # NEW — unified shell components
│   ├── Shell.tsx                     # Root shell with data-app provider
│   ├── TopBar.tsx                    # AppSwitcher + ⌘K + Project + User
│   ├── LeftRail.tsx                  # Collapsible nav with app sections
│   ├── CenterWorkspace.tsx           # Scrollable content area
│   ├── RightContextPane.tsx          # Collapsible details
│   ├── AppProvider.tsx               # data-app context + accent injection
│   └── index.ts
│
├── dashboard-desktop/                # PRODUCTION — keep until migration complete
│   └── ... (frozen, no new features)
│
└── dashboard-v3/                     # DELETE — never mounted, stale

app/
├── (dashboard)/
│   ├── layout.tsx                    # Feature flag router
│   ├── layout-legacy.tsx             # Current dashboard-desktop mount (backup)
│   ├── page.tsx                      # /dashboard — redirect to /app or /app/dashboard
│   │
│   ├── app/                          # NEW ROUTE SEGMENT — unified shell root
│   │   ├── layout.tsx                # UnifiedAppShell mount
│   │   ├── page.tsx                  # Dashboard home (neutral accent)
│   │   │
│   │   ├── site-walk/                # Site Walk workspace (green accent)
│   │   │   ├── layout.tsx            # data-app="site-walk"
│   │   │   ├── page.tsx              # Overview
│   │   │   ├── capture/
│   │   │   ├── walks/
│   │   │   └── deliverables/
│   │   │
│   │   ├── twin-360/                 # Twin 360 workspace (blue accent)
│   │   │   ├── layout.tsx            # data-app="twin-360"
│   │   │   ├── page.tsx              # Overview
│   │   │   ├── capture/
│   │   │   ├── clips/
│   │   │   └── models/
│   │   │
│   │   └── shared/                   # Shared surfaces (inherit or neutral)
│   │       ├── slatedrop/
│   │       ├── contacts/
│   │       ├── calendar/
│   │       └── deliverables/
│   │
│   ├── api/                          # Unchanged
│   ├── projects/                     # Legacy — redirect to /app/projects
│   ├── site-walks/                   # Legacy — redirect to /app/site-walk/walks
│   ├── digital-twins/                # Legacy — redirect to /app/twin-360/models
│   └── slatedrop/                    # Legacy — redirect to /app/shared/slatedrop
│
└── preview/
    └── unified-shell/                # Keep for testing
```

---

## 2. Tailwind v4 Configuration: CSS-First with data-app Selector

Tailwind v4 uses CSS-native configuration. The `--app-accent` variable switches based on `data-app` attribute.

```css
/* app/globals.css (Tailwind v4) */
@import "tailwindcss";

@theme {
  /* Graphite Glass canvas */
  --color-graphite-canvas: #0B0F15;
  --color-graphite-50: #F8FAFC;
  --color-graphite-100: #F1F5F9;
  --color-graphite-200: #E2E8F0;
  --color-graphite-300: #CBD5E1;
  --color-graphite-400: #94A3B8;
  --color-graphite-500: #64748B;
  --color-graphite-600: #475569;
  --color-graphite-700: #334155;
  --color-graphite-800: #1E293B;
  --color-graphite-900: #0F172A;
  --color-graphite-950: #0B0F15;

  /* Accents — NOT utility classes, CSS variables */
  --color-accent-green: #00E699;
  --color-accent-blue: #3D8EFF;
  --color-accent-neutral: #94A3B8;

  /* App-accent variable — switched by data-app */
  --app-accent: var(--color-accent-neutral);
  --app-accent-text: var(--color-graphite-950);
}

/* Accent switching via data-app attribute (on html or body) */
[data-app="site-walk"] {
  --app-accent: var(--color-accent-green);
  --app-accent-text: #0B0F15;
}

[data-app="twin-360"] {
  --app-accent: var(--color-accent-blue);
  --app-accent-text: #FFFFFF;
}

[data-app="dashboard"],
[data-app="shared"] {
  --app-accent: var(--color-accent-neutral);
  --app-accent-text: #0B0F15;
}

/* Usage in components: use the CSS variable directly */
@layer utilities {
  .app-accent {
    color: var(--app-accent);
  }
  .app-accent-bg {
    background-color: var(--app-accent);
    color: var(--app-accent-text);
  }
  .app-accent-border {
    border-color: var(--app-accent);
  }
  .app-accent-ring {
    --tw-ring-color: var(--app-accent);
  }
}

/* Glass panel utility */
@layer components {
  .glass-panel {
    background-color: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 12px;
  }

  .glass-panel-sm {
    background-color: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 8px;
  }

  /* Label mono utility */
  .label-mono {
    font-family: 'IBM Plex Mono', 'SF Mono', monospace;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-graphite-400);
  }
}
```

### TypeScript Token Integration

```typescript
// lib/shell/shell-tokens.ts
export const shellTokens = {
  colors: {
    canvas: '#0B0F15',
    accents: {
      green: '#00E699',
      blue: '#3D8EFF',
      neutral: '#94A3B8',
    },
  },
  layout: {
    topBarHeight: '3.5rem',      // 56px
    railCollapsed: '4.5rem',      // 72px
    railExpanded: '13.75rem',     // 220px
    contextPaneWidth: '20rem',    // 320px
  },
  borderRadius: {
    xl: '12px',
    lg: '8px',
  },
} as const;

// Type-safe app values for data-app attribute
export type AppAccent = 'dashboard' | 'site-walk' | 'twin-360' | 'shared';

export function getAppAccent(pathname: string): AppAccent {
  if (pathname.startsWith('/app/site-walk')) return 'site-walk';
  if (pathname.startsWith('/app/twin-360')) return 'twin-360';
  if (pathname.startsWith('/app/shared')) return 'shared';
  return 'dashboard';
}
```

---

## 3. Layout Feature Flag Router

```typescript
// app/(dashboard)/layout.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const shellVersion = cookieStore.get('shell-version')?.value ?? 'legacy';

  // Feature flag: 'unified' or 'legacy'
  // Can also check user segment, rollout percentage, etc.

  if (shellVersion === 'unified') {
    // Redirect to new /app structure
    redirect('/app');
  }

  // Legacy shell (current production)
  return <LegacyDashboardLayout>{children}</LegacyDashboardLayout>;
}

// Import legacy layout (frozen)
import LegacyDashboardLayout from './layout-legacy';
```

### Opt-in Cookie for Testing

```typescript
// app/api/set-shell-version/route.ts
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { version } = await request.json();

  const cookieStore = await cookies();
  cookieStore.set('shell-version', version, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return Response.json({ success: true });
}
```

```tsx
// Preview toggle component (for internal testing)
'use client';

export function ShellVersionToggle() {
  const setVersion = async (version: string) => {
    await fetch('/api/set-shell-version', {
      method: 'POST',
      body: JSON.stringify({ version }),
    });
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 glass-panel p-4 z-50">
      <p className="label-mono mb-2">Shell Version</p>
      <div className="flex gap-2">
        <button onClick={() => setVersion('legacy')} className="px-3 py-1 text-sm glass-panel-sm hover:bg-white/10">
          Legacy
        </button>
        <button onClick={() => setVersion('unified')} className="px-3 py-1 text-sm glass-panel-sm app-accent-bg">
          Unified
        </button>
      </div>
    </div>
  );
}
```

---

## 4. UnifiedAppShell Implementation

```typescript
// app/(dashboard)/app/layout.tsx
import { UnifiedAppShell } from '@/components/shell-unified';
import { getAppAccent } from '@/lib/shell/shell-tokens';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default to neutral — child layouts override via data-app
  return (
    <UnifiedAppShell>
      {children}
    </UnifiedAppShell>
  );
}
```

```typescript
// app/(dashboard)/app/site-walk/layout.tsx
import { getAppAccent } from '@/lib/shell/shell-tokens';

export default function SiteWalkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-app="site-walk" className="h-full">
      {children}
    </div>
  );
}
```

```typescript
// app/(dashboard)/app/twin-360/layout.tsx
export default function Twin360Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-app="twin-360" className="h-full">
      {children}
    </div>
  );
}
```

### Shared Surfaces: Inherit vs Neutral

**Decision:** Shared surfaces (SlateDrop, Contacts, Calendar) inherit the accent of the app the user navigated from, or default to neutral if accessed directly.

```typescript
// app/(dashboard)/app/shared/layout.tsx
import { cookies } from 'next/headers';

export default async function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const lastApp = cookieStore.get('last-app')?.value ?? 'dashboard';

  // Valid accents only
  const validAccents = ['dashboard', 'site-walk', 'twin-360'];
  const accent = validAccents.includes(lastApp) ? lastApp : 'dashboard';

  return (
    <div data-app={accent} data-shared="true" className="h-full">
      {children}
    </div>
  );
}
```

**Update last-app cookie on navigation:**

```typescript
// middleware.ts or in layout
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Set last-app cookie based on path
  if (request.nextUrl.pathname.startsWith('/app/site-walk')) {
    response.cookies.set('last-app', 'site-walk', { maxAge: 60 * 60 * 24 * 7 });
  } else if (request.nextUrl.pathname.startsWith('/app/twin-360')) {
    response.cookies.set('last-app', 'twin-360', { maxAge: 60 * 60 * 24 * 7 });
  }

  return response;
}
```

---

## 5. Unified Shell Components

```tsx
// components/shell-unified/Shell.tsx
'use client';

import { TopBar } from './TopBar';
import { LeftRail } from './LeftRail';
import { RightContextPane } from './RightContextPane';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface UnifiedAppShellProps {
  children: React.ReactNode;
  showContextPane?: boolean;
}

export function UnifiedAppShell({ children, showContextPane = true }: UnifiedAppShellProps) {
  const [isRailExpanded, setIsRailExpanded] = useState(false);
  const [isContextPaneOpen, setIsContextPaneOpen] = useState(false);

  return (
    <div className="min-h-screen bg-graphite-canvas text-graphite-200 flex flex-col">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <LeftRail
          isExpanded={isRailExpanded}
          onExpandChange={setIsRailExpanded}
        />

        <main className="flex-1 flex min-w-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {children}
          </div>

          {showContextPane && (
            <RightContextPane
              isOpen={isContextPaneOpen}
              onOpenChange={setIsContextPaneOpen}
            />
          )}
        </main>
      </div>
    </div>
  );
}
```

```tsx
// components/shell-unified/TopBar.tsx
'use client';

import { AppSwitcher } from './AppSwitcher';
import { CommandPaletteTrigger } from './CommandPaletteTrigger';
import { ProjectSwitcher } from './ProjectSwitcher';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';

export function TopBar() {
  return (
    <header className="h-14 px-4 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-graphite-canvas/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Logo />
        <AppSwitcher />
      </div>

      <div className="flex-1 max-w-md">
        <CommandPaletteTrigger />
      </div>

      <div className="flex items-center gap-3">
        <ProjectSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
```

```tsx
// components/shell-unified/AppSwitcher.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface AppTab {
  id: 'dashboard' | 'site-walk' | 'twin-360';
  label: string;
  href: string;
}

const apps: AppTab[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/app' },
  { id: 'site-walk', label: 'Site Walk', href: '/app/site-walk' },
  { id: 'twin-360', label: 'Twin 360', href: '/app/twin-360' },
];

export function AppSwitcher() {
  const pathname = usePathname();

  const activeApp = apps.find(app => {
    if (app.id === 'dashboard') return pathname === '/app' || pathname.startsWith('/app/dashboard');
    return pathname.startsWith(app.href);
  }) ?? apps[0];

  return (
    <nav className="flex items-center gap-1 bg-white/[0.04] backdrop-blur-xl rounded-lg p-1 border border-white/[0.10]">
      {apps.map((app) => {
        const isActive = app.id === activeApp.id;

        return (
          <Link
            key={app.id}
            href={app.href}
            className={cn(
              'relative px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200',
              'hover:bg-white/[0.08]',
              isActive ? 'text-white' : 'text-graphite-400 hover:text-graphite-200'
            )}
          >
            {app.label}

            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full app-accent-bg" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
```

---

## 6. resolveDashboardNav Integration

**Keep as single source of truth** — wrap it for the new shell:

```typescript
// lib/navigation/resolve-nav.ts
import { resolveDashboardNav as legacyResolveDashboardNav } from './resolveDashboardNav';
import type { UserEntitlements } from '@/lib/entitlements';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  section: 'shared' | 'site-walk' | 'twin-360';
  requiredEntitlement?: string;
  isPro?: boolean;
}

export function resolveUnifiedNav(
  entitlements: UserEntitlements,
  currentApp: 'dashboard' | 'site-walk' | 'twin-360'
): NavItem[] {
  // Use legacy resolver for base permissions
  const legacyNav = legacyResolveDashboardNav(entitlements);

  // Map to unified structure with app sections
  const sharedItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: 'home', href: '/app', section: 'shared' },
    { id: 'projects', label: 'Projects', icon: 'folder-kanban', href: '/app/projects', section: 'shared' },
    { id: 'slatedrop', label: 'Files', icon: 'folder-open', href: '/app/shared/slatedrop', section: 'shared' },
    { id: 'contacts', label: 'Contacts', icon: 'users', href: '/app/shared/contacts', section: 'shared' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', href: '/app/shared/calendar', section: 'shared' },
    { id: 'deliverables', label: 'Deliverables', icon: 'send', href: '/app/shared/deliverables', section: 'shared' },
  ];

  const appSpecificItems: NavItem[] = [];

  if (currentApp === 'site-walk') {
    appSpecificItems.push(
      { id: 'sw-capture', label: 'Capture', icon: 'camera', href: '/app/site-walk/capture', section: 'site-walk' },
      { id: 'sw-walks', label: 'Walks', icon: 'video', href: '/app/site-walk/walks', section: 'site-walk' },
      { id: 'sw-plans', label: 'Plans', icon: 'map', href: '/app/site-walk/plans', section: 'site-walk', isPro: true },
    );
  }

  if (currentApp === 'twin-360') {
    appSpecificItems.push(
      { id: 't3-capture', label: 'Capture', icon: 'camera', href: '/app/twin-360/capture', section: 'twin-360' },
      { id: 't3-clips', label: 'Clips', icon: 'video', href: '/app/twin-360/clips', section: 'twin-360' },
      { id: 't3-models', label: 'Models', icon: 'box', href: '/app/twin-360/models', section: 'twin-360' },
    );
  }

  // Filter by entitlements
  return [...sharedItems, ...appSpecificItems].filter(item => {
    if (item.isPro && !entitlements.hasPro) return false;
    if (item.requiredEntitlement && !entitlements[item.requiredEntitlement]) return false;
    return true;
  });
}
```

---

## 7. Migration Sequence (Low Risk)

### Week 1: Foundation (No User Impact)
1. Create `components/shell-unified/` directory
2. Implement `Shell.tsx`, `TopBar.tsx`, `AppSwitcher.tsx` (no mounting)
3. Set up Tailwind v4 CSS variables with `data-app` switching
4. Test in `/preview/unified-shell` (already exists)

### Week 2: Route Structure (No User Impact)
1. Create `app/(dashboard)/app/` route segment
2. Create child layouts with `data-app` attributes
3. Add middleware for `last-app` cookie
4. Set up `layout.tsx` feature flag router
5. Internal testing with cookie toggle

### Week 3: Gradual Rollout (5% → 25% → 100%)
1. Enable `shell-version=unified` for internal users
2. Fix issues, verify navigation
3. Roll out to 5% of users via feature flag
4. Monitor errors, rollback if needed
5. Increase to 25%, then 100%

### Week 4: Legacy Cleanup (After Stability)
1. Add redirects from legacy routes to `/app/*`
2. Freeze `dashboard-desktop/` (no new features)
3. After 1 week stability: delete `dashboard-desktop/`
4. Delete `dashboard-v3/` (already dead)
5. Clean up feature flag code

---

## 8. Key Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Refactor vs new build | **New build + gradual mount** | Lower production risk, easy rollback |
| `/slatedrop` accent | **Inherit from `last-app` cookie** | Context preservation, user expectation |
| Shared route neutral? | **Fallback to neutral** | If no cookie, no confusion |
| `resolveDashboardNav` | **Wrap, don't replace** | Single source of truth maintained |
| `dashboard-v3` | **Delete immediately** | Never mounted, no value |
| Rollout strategy | **Cookie-based opt-in → % rollout** | Controlled exposure, instant rollback |

---

## 9. Rollback Plan

If issues detected:

```typescript
// Emergency: Disable unified shell globally
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  // Force legacy
  return <LegacyDashboardLayout>{children}</LegacyDashboardLayout>;
}
```

Or clear cookies:
```bash
# One-liner to reset all users
# (Deploy new version with forced legacy, or clear cookies via edge config)
```

---

*Migration strategy locked: June 29, 2026*
*Next.js App Router + Tailwind v4*
