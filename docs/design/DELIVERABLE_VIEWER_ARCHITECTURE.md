# Deliverable Viewer Architecture — Owner + Share Paths
## Unified ViewerClient with Polymorphic Auth

**Problem:** The public viewer (`/view/[token]`) is tightly coupled to share tokens for both deliverable loading and media access. Owners need to view drafts/unshared deliverables by ID without minting share tokens.

**Solution:** Abstract the viewer from auth concerns. Two loaders (token vs. owner), one viewer component, one media hook with swappable fetcher.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              VIEWERCLIENT                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  Props:                                                                  │  │
│  │    - deliverable: NormalizedDeliverable (unified shape)                  │  │
│  │    - mediaFetcher: MediaFetcher (interface: fetchMediaUrl(itemId))       │  │
│  │    - mode: 'owner' | 'share' (for minor UI: "DRAFT" badge, comments)      │  │
│  │    - user: User | null (for comments, auth actions)                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                    ▲                                             │
│              ┌────────────────────┴────────────────────┐                       │
│              │                                           │                       │
│    ┌─────────┴──────────┐                    ┌─────────┴──────────┐             │
│    │   Owner Entry      │                    │   Share Entry      │             │
│    │  /site-walk/...    │                    │  /view/[token]     │             │
│    └─────────┬──────────┘                    └─────────┬──────────┘             │
│              │                                           │                       │
│    ┌─────────▼──────────┐                    ┌─────────▼──────────┐             │
│    │ loadDeliverableById│                    │loadDeliverableByToken│            │
│    │   (org gated)      │                    │   (token gated)    │             │
│    └─────────┬──────────┘                    └─────────┬──────────┘             │
│              │                                           │                       │
│    ┌─────────▼──────────┐                    ┌─────────▼──────────┐             │
│    │ OwnerMediaFetcher  │                    │ TokenMediaFetcher  │             │
│    │ /api/site-walk/... │                    │ /api/view/...      │             │
│    │ org + RLS check    │                    │ token-only         │             │
│    └────────────────────┘                    └────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Key principle:** The viewer receives already-normalized data and a media fetcher interface. It knows nothing about tokens, orgs, or auth — it just calls `mediaFetcher.getUrl(itemId)`.

---

## 2. Exact Files + Routes

### New Files

```
app/
├── (dashboard)/
│   └── site-walk/
│       └── deliverables/
│           └── [id]/
│               ├── page.tsx                    # Server component, owner entry
│               └── OwnerDeliverableError.tsx   # 403/404 owner-specific errors
├── api/
│   ├── site-walk/
│   │   └── deliverables/
│   │       └── [id]/
│   │           ├── route.ts                    # GET deliverable by id (org gated)
│   │           └── media/
│   │               └── [mediaItemId]/
│   │                   └── route.ts            # GET media stream (org + RLS)
│   └── view/
│       └── [token]/
│           └── media/
│               └── [mediaItemId]/
│                   └── route.ts                # Existing: token-gated media

components/
├── deliverables/
│   ├── ViewerClient.tsx                        # Existing, REFACTORED (see §3)
│   ├── DeliverableShell.tsx                    # NEW: layout wrapper
│   ├── media/
│   │   ├── MediaFetcher.ts                     # NEW: interface + implementations
│   │   ├── useMediaResolver.ts                 # NEW: hook consuming fetcher
│   │   ├── TokenMediaFetcher.ts                # NEW: fetcher impl
│   │   └── OwnerMediaFetcher.ts                # NEW: fetcher impl
│   └── loaders/
│       ├── loadDeliverableById.ts              # NEW: owner loader
│       ├── loadDeliverableByToken.ts           # Existing, normalized
│       └── normalizeDeliverable.ts             # NEW: shared normalization

lib/
└── deliverables/
    └── types.ts                                # Extended: MediaFetcher interface
```

### Route Table

| Route | Purpose | Auth |
|-------|---------|------|
| `/site-walk/deliverables/[id]` | Owner view of deliverable | Session + org membership + (created_by OR org_admin) |
| `/api/site-walk/deliverables/[id]` | Get deliverable JSON | Same as above |
| `/api/site-walk/deliverables/[id]/media/[mediaItemId]` | Stream media for owner | Session + org membership + deliverable ownership |
| `/view/[token]` | Public share view | Token only (existing) |
| `/api/view/[token]/media/[mediaItemId]` | Stream media for share | Token only (existing) |

---

## 3. MediaFetcher Interface (The Abstraction)

```typescript
// components/deliverables/media/MediaFetcher.ts

/**
 * Abstract interface for media resolution.
 * Implementations handle auth differently (token vs session)
 * but present unified interface to ViewerClient.
 */
export interface MediaFetcher {
  /**
   * Get a URL (or presigned URL) for media item.
   * May return direct S3 URL, proxied stream URL, or data URI for small items.
   */
  getUrl(mediaItemId: string, variant?: 'thumbnail' | 'full'): Promise<string>;
  
  /**
   * Get headers required for fetch (if any).
   * Token fetcher adds Authorization; owner fetcher adds cookies implicitly.
   */
  getHeaders?(): Record<string, string>;
  
  /**
   * Revoke/release any resources (presigned URLs may need cleanup).
   */
  revoke?(url: string): void;
  
  /**
   * Fetcher identity for debugging/telemetry.
   */
  readonly mode: 'owner' | 'share';
}

// Factory based on context
export function createMediaFetcher(
  mode: 'owner',
  deliverableId: string
): MediaFetcher;
export function createMediaFetcher(
  mode: 'share', 
  token: string
): MediaFetcher;
export function createMediaFetcher(
  mode: 'owner' | 'share',
  id: string
): MediaFetcher {
  if (mode === 'owner') {
    return new OwnerMediaFetcher(id);
  }
  return new TokenMediaFetcher(id);
}
```

### OwnerMediaFetcher Implementation

```typescript
// components/deliverables/media/OwnerMediaFetcher.ts
export class OwnerMediaFetcher implements MediaFetcher {
  readonly mode = 'owner' as const;
  
  constructor(private deliverableId: string) {}
  
  async getUrl(mediaItemId: string, variant: 'thumbnail' | 'full' = 'full'): Promise<string> {
    // Returns proxied API route URL
    // Browser sends cookies automatically; no token needed in URL
    const variantPath = variant === 'thumbnail' ? '?v=thumb' : '';
    return `/api/site-walk/deliverables/${this.deliverableId}/media/${mediaItemId}${variantPath}`;
  }
  
  // No custom headers needed — browser sends session cookie
  revoke(): void {
    // No-op for owner fetcher (no presigned URLs to revoke)
  }
}
```

### TokenMediaFetcher Implementation

```typescript
// components/deliverables/media/TokenMediaFetcher.ts
export class TokenMediaFetcher implements MediaFetcher {
  readonly mode = 'share' as const;
  
  constructor(private token: string) {}
  
  async getUrl(mediaItemId: string, variant: 'thumbnail' | 'full' = 'full'): Promise<string> {
    const variantPath = variant === 'thumbnail' ? '?v=thumb' : '';
    return `/api/view/${this.token}/media/${mediaItemId}${variantPath}`;
  }
  
  // No headers — token is in URL path
}
```

---

## 4. ViewerClient Refactor

### Current (coupled)

```typescript
// components/deliverables/ViewerClient.tsx (BEFORE)
interface ViewerClientProps {
  token: string;                              // Too specific
  deliverable: ShareDeliverableViewModel;   // Share-specific shape
}

// Inside: directly calls `/api/view/${token}/media/${id}`
```

### Refactored (abstracted)

```typescript
// components/deliverables/ViewerClient.tsx (AFTER)
import { MediaFetcher } from './media/MediaFetcher';
import { NormalizedDeliverable } from './loaders/normalizeDeliverable';

interface ViewerClientProps {
  deliverable: NormalizedDeliverable;  // Unified shape (both paths)
  mediaFetcher: MediaFetcher;           // Abstracted media access
  mode: 'owner' | 'share';
  user?: User;                          // For owner actions (edit, share, delete)
}

export function ViewerClient({ 
  deliverable, 
  mediaFetcher, 
  mode, 
  user 
}: ViewerClientProps) {
  // Hook consumes the fetcher
  const mediaResolver = useMediaResolver(mediaFetcher);
  
  return (
    <DeliverableShell mode={mode} deliverable={deliverable}>
      {/* Owner-only UI */}
      {mode === 'owner' && (
        <OwnerBadgeBar 
          status={deliverable.status} 
          onEdit={() => navigateToEditor(deliverable.id)}
          onShare={() => openShareModal(deliverable.id)}
        />
      )}
      
      {/* Shared UI — identical for both paths */}
      <StopTimeline 
        items={deliverable.items}
        renderMedia={(item) => (
          <LazyMedia 
            item={item} 
            resolveUrl={() => mediaResolver.getUrl(item.mediaItemId)}
          />
        )}
      />
      
      {/* Comments — conditionally allow posting */}
      <CommentsSection 
        deliverableId={deliverable.id}
        allowPosting={mode === 'owner' || deliverable.allowComments}
        currentUser={user}
      />
    </DeliverableShell>
  );
}
```

### NormalizedDeliverable Shape

```typescript
// components/deliverables/loaders/normalizeDeliverable.ts

/**
 * Common shape — both owner and share loaders normalize to this.
 * Eliminates DB-specific column names from ViewerClient.
 */
export interface NormalizedDeliverable {
  id: string;
  title: string;
  project: {
    id: string;
    name: string;
    coverImageUrl?: string;
  };
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    orgName: string;
  };
  status: 'draft' | 'shared' | 'archived';
  
  // Content
  items: DeliverableItem[];  // Stops, media, notes in display order
  planOverlays?: PlanOverlay[]; // DEL-002
  
  // Share-specific (null for owner drafts)
  share?: {
    token: string;
    expiry: Date | null;
    viewLimit: number | null;
    viewsUsed: number;
    allowComments: boolean;
  };
  
  // Owner-only
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
}

// Both loaders call this
export function normalizeDeliverable(
  raw: DatabaseDeliverable,
  mode: 'owner' | 'share'
): NormalizedDeliverable {
  return {
    id: raw.id,
    title: raw.content.title || `Deliverable ${raw.id.slice(0, 8)}`,
    project: {
      id: raw.project_id,
      name: raw.project?.name ?? 'Unknown Project',
      coverImageUrl: raw.project?.cover_image_url
    },
    createdAt: new Date(raw.created_at),
    createdBy: {
      id: raw.created_by,
      name: raw.creator?.full_name ?? 'Unknown',
      orgName: raw.org?.name ?? 'Unknown Org'
    },
    status: raw.status,
    items: normalizeItems(raw.content.items),
    planOverlays: raw.content.plan_overlays,
    share: mode === 'share' ? {
      token: raw.share_token!,
      expiry: raw.share_expiry ? new Date(raw.share_expiry) : null,
      viewLimit: raw.view_limit,
      viewsUsed: raw.views_used ?? 0,
      allowComments: raw.allow_comments ?? false
    } : undefined,
    permissions: mode === 'owner' ? {
      canEdit: true,
      canDelete: raw.status !== 'shared', // Can't delete active shares
      canShare: true
    } : undefined
  };
}
```

---

## 5. Server Components

### Owner Entry Point

```typescript
// app/(dashboard)/site-walk/deliverables/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadDeliverableById } from '@/components/deliverables/loaders/loadDeliverableById';
import { ViewerClient } from '@/components/deliverables/ViewerClient';
import { OwnerMediaFetcher } from '@/components/deliverables/media/OwnerMediaFetcher';
import { getUser } from '@/lib/auth/session';

interface PageProps {
  params: { id: string };
}

export default async function OwnerDeliverablePage({ params }: PageProps) {
  const user = await getUser();
  if (!user) redirect('/login');
  
  const supabase = await createClient();
  
  // Auth check: org membership + (owner OR admin)
  const { data: deliverable, error } = await loadDeliverableById(
    supabase, 
    params.id, 
    user
  );
  
  if (error === 'NOT_FOUND' || error === 'UNAUTHORIZED') {
    notFound();
  }
  
  // Create fetcher for this owner session
  const mediaFetcher = new OwnerMediaFetcher(params.id);
  
  return (
    <ViewerClient
      deliverable={deliverable}
      mediaFetcher={mediaFetcher}
      mode="owner"
      user={user}
    />
  );
}

// Metadata
export async function generateMetadata({ params }: PageProps) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('site_walk_deliverables')
    .select('content->title, project_id')
    .eq('id', params.id)
    .single();
    
  return {
    title: `${data?.title ?? 'Deliverable'} — Slate360`,
    robots: 'noindex' // Owner pages shouldn't be indexed
  };
}
```

### Share Entry Point (Existing, Refactored)

```typescript
// app/view/[token]/page.tsx (REFACTORED)
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadDeliverableByToken } from '@/components/deliverables/loaders/loadDeliverableByToken';
import { ViewerClient } from '@/components/deliverables/ViewerClient';
import { TokenMediaFetcher } from '@/components/deliverables/media/TokenMediaFetcher';

interface PageProps {
  params: { token: string };
}

export default async function ShareDeliverablePage({ params }: PageProps) {
  const supabase = await createClient();
  
  const { data: deliverable, error } = await loadDeliverableByToken(
    supabase,
    params.token
  );
  
  if (error) {
    return <ShareErrorView error={error} />; // Expired, limit reached, etc.
  }
  
  // Record view (fire-and-forget)
  recordView(params.token).catch(console.error);
  
  const mediaFetcher = new TokenMediaFetcher(params.token);
  
  return (
    <ViewerClient
      deliverable={deliverable}
      mediaFetcher={mediaFetcher}
      mode="share"
      // No user — share is anonymous
    />
  );
}
```

---

## 6. Media API Routes

### Owner Media Route

```typescript
// app/api/site-walk/deliverables/[id]/media/[mediaItemId]/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
    mediaItemId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  
  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  // 2. Deliverable ownership/org check
  const { data: deliverable, error: delivError } = await supabase
    .from('site_walk_deliverables')
    .select('org_id, created_by')
    .eq('id', params.id)
    .single();
    
  if (delivError || !deliverable) {
    return new NextResponse('Not found', { status: 404 });
  }
  
  // 3. Org membership check
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', deliverable.org_id)
    .eq('user_id', user.id)
    .single();
    
  const isAuthorized = membership && (
    deliverable.created_by === user.id || 
    ['admin', 'owner'].includes(membership.role)
  );
  
  if (!isAuthorized) {
    return new NextResponse('Unauthorized', { status: 403 });
  }
  
  // 4. Get media from unified_files (via deliverable content reference)
  // The deliverable content.items contains media_item_ids referencing unified_files
  const { data: mediaItem } = await supabase
    .from('unified_files')
    .select('s3_key, content_type, size_bytes')
    .eq('id', params.mediaItemId)
    .single();
    
  if (!mediaItem) {
    return new NextResponse('Media not found', { status: 404 });
  }
  
  // 5. Generate presigned URL or stream via RLS
  const { data: signedUrl, error: signError } = await supabase
    .storage
    .from('media')
    .createSignedUrl(mediaItem.s3_key, 60); // 60 seconds
    
  if (signError) {
    return new NextResponse('Failed to access media', { status: 500 });
  }
  
  // 6. Proxy or redirect
  const variant = request.nextUrl.searchParams.get('v');
  if (variant === 'thumb') {
    // Return thumbnail URL
    const thumbKey = mediaItem.s3_key.replace('/original/', '/thumbs/');
    const { data: thumbUrl } = await supabase.storage.from('media').createSignedUrl(thumbKey, 60);
    return NextResponse.redirect(thumbUrl?.signedUrl ?? signedUrl.signedUrl);
  }
  
  return NextResponse.redirect(signedUrl.signedUrl);
}
```

### Token Media Route (Existing, Minor Refactor)

```typescript
// app/api/view/[token]/media/[mediaItemId]/route.ts
// Keep existing logic — only verify token is valid, not expired, views not exceeded
// Then return presigned URL for the media

// REFACTOR: Use shared helper for presigned URL generation
import { getMediaPresignedUrl } from '@/lib/deliverables/media-access';

export async function GET(request: NextRequest, { params }: RouteParams) {
  // 1. Validate token
  const tokenData = await validateShareToken(params.token);
  if (!tokenData.valid) {
    return new NextResponse(tokenData.error, { status: tokenData.status });
  }
  
  // 2. Verify mediaItemId is in deliverable content
  const hasAccess = await verifyMediaInDeliverable(
    tokenData.deliverableId, 
    params.mediaItemId
  );
  
  if (!hasAccess) {
    return new NextResponse('Media not in deliverable', { status: 403 });
  }
  
  // 3. Use shared helper (same as owner route)
  const signedUrl = await getMediaPresignedUrl(params.mediaItemId, {
    variant: request.nextUrl.searchParams.get('v') as 'thumb' | 'full'
  });
  
  return NextResponse.redirect(signedUrl);
}
```

---

## 7. Keeping Paths from Diverging

### Strategy: Shared Everything Except Entry

| Layer | Shared? | Notes |
|-------|---------|-------|
| ViewerClient.tsx | ✅ Yes | Receives normalized data + fetcher |
| DeliverableShell.tsx | ✅ Yes | Layout wrapper, minor mode-based badges |
| StopTimeline.tsx | ✅ Yes | Same component both paths |
| Media components | ✅ Yes | Use `useMediaResolver()` hook |
| Normalization | ✅ Yes | `normalizeDeliverable()` called by both loaders |
| Loaders | ❌ Separate | `loadDeliverableById` vs `loadDeliverableByToken` |
| Media routes | ❌ Separate | Auth models differ (session vs token) |
| Error UI | ⚠️ Shared base | `DeliverableErrorView` with mode-specific copy |

### Testing Strategy

```typescript
// tests/deliverables/viewer.test.tsx
import { render } from '@testing-library/react';
import { ViewerClient } from '@/components/deliverables/ViewerClient';
import { OwnerMediaFetcher } from '@/components/deliverables/media/OwnerMediaFetcher';
import { TokenMediaFetcher } from '@/components/deliverables/media/TokenMediaFetcher';
import { mockNormalizedDeliverable } from './fixtures';

describe('ViewerClient', () => {
  const deliverable = mockNormalizedDeliverable();
  
  it('renders owner mode with edit controls', () => {
    const fetcher = new OwnerMediaFetcher(deliverable.id);
    const { getByText } = render(
      <ViewerClient 
        deliverable={deliverable} 
        mediaFetcher={fetcher} 
        mode="owner"
        user={mockUser()}
      />
    );
    expect(getByText('Edit')).toBeInTheDocument();
    expect(getByText('DRAFT')).toBeInTheDocument();
  });
  
  it('renders share mode without edit controls', () => {
    const fetcher = new TokenMediaFetcher('token_abc123');
    const { queryByText } = render(
      <ViewerClient 
        deliverable={deliverable} 
        mediaFetcher={fetcher} 
        mode="share"
      />
    );
    expect(queryByText('Edit')).not.toBeInTheDocument();
    expect(queryByText('DRAFT')).not.toBeInTheDocument();
  });
  
  it('renders identical timeline for both modes', () => {
    // Same assertions for stop display, media, comments
  });
});
```

### Lint/Guard Rule

```typescript
// .eslintrc custom rule (or manual code review checklist)
// ENFORCE: ViewerClient must not import from 'next/headers' or use cookies
// ENFORCE: All data loading must happen in page.tsx (server) or loader.ts
// ENFORCE: Media URLs must come from MediaFetcher interface, never hardcoded
```

---

## 8. Summary

| Approach | Verdict |
|----------|---------|
| **(a) Parallel routes + abstraction** | ✅ **Recommended** — clean separation, auth-appropriate, no token abuse |
| (b) Preview tokens | ❌ Rejected — conflates share concept, token leakage risk, complicates token lifecycle |
| (c) Presigned URLs in server component | ❌ Rejected — URLs expire, viewer needs refresh logic, couples URL lifetime to render |

**Key wins:**
1. **No divergence:** Same `ViewerClient`, `DeliverableShell`, `StopTimeline` for both paths
2. **Auth-appropriate:** Session cookies for owners (secure, revocable), tokens for shares (time/scope limited)
3. **Maintainable:** Add features to viewer once, both paths benefit
4. **Type-safe:** TypeScript enforces `MediaFetcher` interface compliance
5. **Testable:** Easy to mock fetcher, test viewer logic independently of auth

---

*Architecture decision: June 29, 2026*
