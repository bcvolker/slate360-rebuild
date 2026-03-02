# Homepage — Complete System Blueprint

**Last Updated:** 2026-03-02
**File:** `app/page.tsx` (781 lines — `"use client"`)
**Live URL:** https://www.slate360.ai
**Purpose:** Single source of truth for the Slate360 marketing homepage. Authoritative enough to rebuild from scratch.

---

## Table of Contents

1. [Page Overview](#1-page-overview)
2. [Visual Identity](#2-visual-identity)
3. [Section Layout](#3-section-layout)
4. [Sections — Detailed Spec](#4-sections--detailed-spec)
5. [Key Components](#5-key-components)
6. [Platform Cards Data](#6-platform-cards-data)
7. [Pricing Tiers Data](#7-pricing-tiers-data)
8. [Interactive Features](#8-interactive-features)
9. [Routes Referenced](#9-routes-referenced)
10. [Dependencies](#10-dependencies)
11. [SEO & Performance](#11-seo--performance)
12. [Reconstruction Checklist](#12-reconstruction-checklist)

---

## 1. Page Overview

The homepage is a **single-page marketing site** for Slate360. It is publicly accessible (no auth required). It:
- Showcases all 8 modules with live interactive previews.
- Shows pricing tiers with monthly/annual toggle.
- Drives sign-ups via `Start free trial` CTAs.
- Uses an interactive 3D model viewer (WebGL) and 360° panorama viewer.

The page is a **client component** (`"use client"`) because of the 3D model viewer, interactive toggles, and modal state.

---

## 2. Visual Identity

| Element | Value |
|---|---|
| Primary color | `#1E3A8A` (Slate Blue) |
| Accent color | `#FF4D00` (Slate Orange) |
| Background | `#FFFFFF` main, `#E8EEF6` alternate sections |
| Font style | `font-black tracking-tight` for headings, `text-gray-500` for body |
| Border radius | `rounded-2xl` for cards, `rounded-full` for pills/buttons |
| Button style | `rounded-full` primary buttons with `hover:scale-105` |
| Card hover | `hover:border-gray-300 hover:shadow-lg hover:-translate-y-0.5` |

### Headline

```
"See it. Experience it. Own it."
```

Blue `#1E3A8A` for "See it. Experience it." + Orange `#FF4D00` for "Own it."

### Subheadline

```
"Manage building projects administratively and visually — one elegant platform
for professionals who build, design, and deliver."
```

---

## 3. Section Layout

```
1. Navbar (sticky)
2. Hero (full viewport: headline + 3D model viewer)
3. The Platform — 8 feature cards (bg: #E8EEF6)
4. More Powerful Tools — 4 supporting feature cards (bg: gray-100/80)
5. Pricing Teaser — 4 plan cards with monthly/annual toggle (bg: #E8EEF6)
6. CTA Band (bg: #1E3A8A, full-width dark blue)
7. Footer
```

---

## 4. Sections — Detailed Spec

### 4.1 Navbar

Component: `components/Navbar.tsx`
- Logo (left)
- Nav links: Platform, Pricing, About
- Right: "Log in" (link to `/login`) + "Get started" button (orange, links to `/signup`)
- Sticky, transparent on scroll start, `bg-white/95 backdrop-blur` when scrolled.

### 4.2 Hero Section

Full-viewport (`min-h-[100dvh]`). Gradient background: `from-blue-50/40 via-white to-orange-50/30`.

**Left column (lg:col-span-6):**
- `<h1>` headline: 4xl → 6xl → 7xl responsive
- Subheadline paragraph
- Two CTAs:
  - "Start free trial" → `/signup?plan=creator&billing=monthly` (orange button)
  - "View pricing" → `/plans` (outlined button)

**Right column (lg:col-span-6):**
- `<ModelViewer>` (dynamic import, SSR disabled)
  - `src="/uploads/csb-stadium-model.glb"`
  - 16:9 mobile, 4:3 sm, 16:10 lg
  - `cameraOrbit="30deg 75deg 85%"`, `shadowIntensity={1}`, `shadowSoftness={0.8}`
  - `interactive` prop toggles orbit control
- "Expand" button → `ViewerModal` with zoom/reset controls
- "⊕ Interact" toggle button (bottom-left of viewer)

### 4.3 The Platform — 8 Cards

Background: `#E8EEF6`. Grid: `grid-cols-1 md:grid-cols-2`.

Each card is a side-by-side layout:
- Left half: text content (icon emoji, label tag, title, description, "Learn more" link)
- Right half: dark `bg-black` preview area

Platform card data defined in `platforms[]` array (see Section 6).

**Preview content per card:**
| Card | Preview |
|---|---|
| Project Hub | Placeholder emoji (no interactive) |
| Design Studio | `<ModelViewer>` — same GLB file, interactive toggle |
| Content Studio | Placeholder emoji |
| 360 Tour Builder | Pannellum iframe (`pletchers.jpg`) with auto-pan `animate-pan-360` CSS animation before interactive |
| Geospatial & Robotics | Placeholder emoji |
| Virtual Studio | Placeholder emoji |
| Analytics & Reports | Placeholder emoji |
| Slate360 Apps | `3×3 grid of emoji app tiles` |

All cards have an "Expand" button that opens `ViewerModal`. Platform cards without a unique preview show the emoji + "Preview" label in fullscreen modal.

### 4.4 More Powerful Tools — 4 Cards

Background: `bg-gray-100/80`. Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

4 cards with Lucide icons, title, description, "Learn more" link. Orange icon background `#FF4D001A`.

Cards:
1. SlateDrop (FolderOpen) → `/features/slatedrop`
2. GPU-Powered Processing (Cpu) → `/features/gpu-processing`
3. Easy Collaboration (Users) → `/features/collaboration`
4. Digital Twin Creation (ScanLine) → `/features/digital-twins`

### 4.5 Pricing Teaser

Background: `#E8EEF6`. Grid: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`.

- Monthly/Annual toggle (annual shows 17% discount note, monthly→annual price swap).
- 4 plan cards: Creator, Model, Business (highlighted with orange border + "Most popular"), Enterprise.
- Business plan: `border-2 border-[#FF4D00]`, orange "Most popular" badge.
- Each card: plan name, tagline, price, feature list, CTA button.
- Enterprise CTA links to `mailto:hello@slate360.ai`.
- All others: `/signup?plan={name.toLowerCase()}&billing={billing}`.
- "See full pricing & Enterprise" link → `/plans`.

### 4.6 CTA Band

Background `#1E3A8A`. Text white.

```
"Your next project, fully managed."
"Join professionals who manage, visualize, and deliver projects with Slate360.
No credit card required."
```

Two CTAs:
- "Start free trial" → `/signup?plan=creator&billing=monthly` (orange)
- "Explore Design Studio" → `/features/design-studio` (outlined white)

### 4.7 Footer

Component: `components/Footer.tsx`
- Links: Platform pages, Company (About, Pricing, Terms, Privacy), Contact
- Copyright

---

## 5. Key Components

### `ViewerCard`

Wrapper for inline 3D/360 viewers on the homepage with "Interact" + "Expand" buttons.

```tsx
<ViewerCard onInteract={() => setInteractive(v => !v)} onExpand={() => setModal(true)} interacted={interactive}>
  <ModelViewer ... interactive={interactive} />
</ViewerCard>
```

### `ViewerModal`

Full-screen modal (65% on desktop, 90% on mobile). Used for expanding 3D viewer and platform card previews.

```tsx
<ViewerModal open={modal3D} onClose={() => setModal3D(false)} title="3D Building Model">
  <ModelViewer ... />
</ViewerModal>
```

Dims background with `bg-black/60 backdrop-blur-sm`. Click outside to close. Close button (`X`) top-right.

### `ModelViewer` (dynamic import)

```typescript
const ModelViewer = dynamic(() => import("@/components/ModelViewerClient"), {
  ssr: false,
  loading: () => <div>Loading 3D…</div>,
});
```

`components/ModelViewerClient.tsx` wraps `<model-viewer>` (Google Model Viewer web component).

### Pannellum 360 viewer

No React component — loaded via iframe:
```typescript
`https://cdn.pannellum.org/2.5/pannellum.htm#panorama=${encodeURIComponent(imageUrl)}&autoLoad=true`
```

### CSS animation for 360 auto-pan

```css
/* In app/globals.css */
@keyframes pan-360 {
  0%   { transform: translateX(0); }
  50%  { transform: translateX(-66.66%); }
  100% { transform: translateX(0); }
}
.animate-pan-360 {
  animation: pan-360 20s ease-in-out infinite;
  width: 300%;
}
```

---

## 6. Platform Cards Data

```typescript
const platforms = [
  {
    key: "project-hub",
    href: "/project-hub",        // Direct app link (auth-gated — redirects to login)
    label: "Manage",
    title: "Project Hub",
    desc: "Command center for every project — RFIs, submittals, budgets, schedules, and team coordination in one place.",
    accent: "#1E3A8A",
    bg: "from-blue-50 to-white",
  },
  {
    key: "design-studio",
    icon: "✏️",
    label: "Design",
    title: "Design Studio",
    desc: "Context-aware 3D modeling, 2D plan markup, fabrication prep, and version control — one workspace that adapts to your task.",
    href: "/features/design-studio",
    accent: "#FF4D00",
    bg: "from-orange-50 to-white",
  },
  {
    key: "content-studio",
    icon: "🎨",
    label: "Create",
    title: "Content Studio",
    desc: "Create marketing materials, client presentations, and polished deliverables directly from your project data.",
    href: "/features/content-studio",
    accent: "#FF4D00",
    bg: "from-orange-50 to-white",
  },
  {
    key: "360-tour-builder",
    icon: "🔭",
    label: "Visualize",
    title: "360 Tour Builder",
    desc: "Capture and share immersive 360° walkthroughs of any site, structure, or space. Embed anywhere.",
    href: "/features/360-tour-builder",
    accent: "#1E3A8A",
    bg: "from-blue-50 to-white",
  },
  {
    key: "geospatial-robotics",
    icon: "🛰️",
    label: "Survey",
    title: "Geospatial & Robotics",
    desc: "Drone mapping, photogrammetry, LiDAR point clouds, and volumetric calculations — fully automated.",
    href: "/features/geospatial-robotics",
    accent: "#FF4D00",
    bg: "from-orange-50 to-white",
  },
  {
    key: "virtual-studio",
    icon: "🎬",
    label: "Present",
    title: "Virtual Studio",
    desc: "Photorealistic renderings, fly-through animations, and client-ready presentations from your 3D models.",
    href: "/features/virtual-studio",
    accent: "#1E3A8A",
    bg: "from-blue-50 to-white",
  },
  {
    key: "analytics-reports",
    icon: "📊",
    label: "Analyze",
    title: "Analytics & Reports",
    desc: "Project dashboards, credit consumption trends, portfolio-level insights, and exportable reports.",
    href: "/features/analytics-reports",
    accent: "#FF4D00",
    bg: "from-orange-50 to-white",
  },
  {
    key: "slate360-apps",
    icon: "🧩",
    label: "Extend",
    title: "Slate360 Apps",
    desc: "Downloadable and subscribable apps that integrate seamlessly — one login, one file system, one subscription.",
    href: "/features/ecosystem-apps",
    accent: "#1E3A8A",
    bg: "from-blue-50 to-white",
  },
];
```

---

## 7. Pricing Tiers Data

```typescript
const plans = [
  {
    name: "Creator",
    price: "$79",
    annualPrice: "$66",           // /mo billed annually
    desc: "For visual content creators and solo operators.",
    features: ["360 Tour Builder", "Virtual Studio", "40 GB storage", "6,000 credits/mo"],
  },
  {
    name: "Model",
    price: "$199",
    annualPrice: "$166",
    desc: "For advanced modelers, architects, and drone operators.",
    features: ["Design Studio", "Geospatial & Robotics", "150 GB storage", "15,000 credits/mo"],
  },
  {
    name: "Business",
    price: "$499",
    annualPrice: "$416",
    desc: "Full platform access for teams.",
    features: ["All modules", "Project Hub", "750 GB storage", "30,000 credits/mo"],
    highlight: true,    // Orange border + "Most popular" badge
  },
  {
    name: "Enterprise",
    price: "Custom",
    annualPrice: "Custom",
    desc: "For large firms, multi-team orgs, and government.",
    features: ["Everything in Business", "Seat management & SSO", "Custom storage & credits", "Dedicated support SLA"],
  },
];
```

**Note:** These prices must stay in sync with `lib/entitlements.ts` (`monthlyPrice`, `annualPrice`) and with Stripe price IDs in Vercel env vars.

---

## 8. Interactive Features

### State variables

```typescript
const [modal3D, setModal3D] = useState(false);         // Hero 3D modal open
const [heroInteractive, setHeroInteractive] = useState(false);   // Hero model orbit-on-click
const [designInteractive, setDesignInteractive] = useState(false); // Design Studio card model
const [tourInteractive, setTourInteractive] = useState(false);   // 360 Tour Builder card iframe
const [modalCard, setModalCard] = useState<string | null>(null); // Which platform card modal open
const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
const [mounted, setMounted] = useState(false);         // Prevents SSR hydration mismatch for dynamic viewers
```

### `mounted` guard

```typescript
useEffect(() => { setMounted(true); }, []);
// All ModelViewer and Pannellum iframes: {mounted && <...>}
```

This prevents SSR hydration errors from `<model-viewer>` (browser-only web component).

### 3D model controls in expanded modal

Zoom in, zoom out, reset view buttons that directly manipulate the `model-viewer` DOM element via `getCameraOrbit()`. See homepage source for implementation.

---

## 9. Routes Referenced

| Link / Destination | Purpose |
|---|---|
| `/signup?plan=creator&billing=monthly` | Primary CTA — starts free trial |
| `/plans` | Full pricing page |
| `/login` | Login |
| `/project-hub` | Direct link to Project Hub (in Platform card) |
| `/features/design-studio` | Design Studio feature page (to be built) |
| `/features/content-studio` | Content Studio feature page |
| `/features/360-tour-builder` | 360 Tour feature page |
| `/features/geospatial-robotics` | Geo feature page |
| `/features/virtual-studio` | Virtual Studio feature page |
| `/features/analytics-reports` | Analytics feature page |
| `/features/ecosystem-apps` | Apps marketplace feature page |
| `/features/slatedrop` | SlateDrop feature page |
| `/features/gpu-processing` | GPU processing feature page |
| `/features/collaboration` | Collaboration feature page |
| `/features/digital-twins` | Digital twins feature page |
| `mailto:hello@slate360.ai` | Enterprise contact |

**Note:** Most `/features/*` pages do not exist yet — they will show a placeholder or redirect to the relevant dashboard tab.

---

## 10. Dependencies

| Package | Version | Usage |
|---|---|---|
| `@google/model-viewer` | v4.x (web component) | 3D GLB model display |
| `dynamic()` from Next.js | Built-in | SSR-disabled ModelViewer wrapper |
| Pannellum | CDN (2.5) | 360° panorama viewer (iframe) |
| Lucide React | 0.575.x | Icons (ArrowRight, ChevronRight, Check, etc.) |
| Next.js Link | Built-in | All internal navigation |

**3D asset:** `/public/uploads/csb-stadium-model.glb` — the main showcase model.

**360 asset:** `/public/uploads/pletchers.jpg` — equirectangular panorama image.

---

## 11. SEO & Performance

- Page is `"use client"` — rendered on client. SSR metadata should be set in `app/layout.tsx` or a wrapper server component.
- `<ModelViewer>` is lazy-loaded (dynamic import, `ssr: false`) so it doesn't block initial paint.
- Pannellum is an external CDN iframe — no JS bundle impact.
- Images: `/uploads/pletchers.jpg` should be served with proper caching headers (`Cache-Control: public, max-age=31536000`).
- The 3D GLB file is large — consider adding a `loading` skeleton and ensuring the `.glb` is properly cached with long TTL in Vercel/S3 edge config.

### Future SEO improvements

- Convert to a server component wrapper + client island pattern to allow Next.js to pre-render the text content.
- Add `<title>`, `<meta description>`, OpenGraph tags in `app/layout.tsx` or dedicated metadata export.

---

## 12. Reconstruction Checklist

- [ ] `app/page.tsx` — main page (client component, all sections, state management)
- [ ] `components/Navbar.tsx` — sticky navbar with logo, nav links, CTA buttons
- [ ] `components/Footer.tsx` — links, copyright
- [ ] `components/ModelViewerClient.tsx` — `<model-viewer>` web component wrapper
- [ ] `/public/uploads/csb-stadium-model.glb` — 3D showcase asset
- [ ] `/public/uploads/pletchers.jpg` — 360° panorama asset
- [ ] `app/globals.css` — `@keyframes pan-360` + `.animate-pan-360` animation
- [ ] Pricing on homepage must match `lib/entitlements.ts` price values
- [ ] `mounted` guard on all dynamic client-only components
- [ ] Platform card "Expand" modals — 65% desktop, 90% mobile
- [ ] Annual/monthly billing toggle — `billing` state, price swap in plan cards
- [ ] CTA flow: "Start free trial" → `/signup?plan=creator&billing=monthly`
