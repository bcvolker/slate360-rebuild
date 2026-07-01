# Slate360 Mobile Blockers — Capture Safe Areas & Shell Layout

## Blocker 1: Capture Screen (Capacitor WKWebView)

### 1a) Safe Areas: Dynamic Island + Notch Handling

**The Problem:**
- `100vh` includes the area under Dynamic Island/notch on iOS
- `env(safe-area-inset-top)` works only with `viewport-fit=cover`
- Capacitor WKWebView needs explicit viewport meta tag configuration

**Solution: Viewport + CSS Strategy**

```html
<!-- app/layout.tsx or index.html for Capacitor -->
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no"
/>
```

```css
/* globals.css — Capacitor-specific safe area handling */
@supports (padding-top: env(safe-area-inset-top)) {
  :root {
    /* iOS safe areas — these work WITH viewport-fit=cover */
    --sat: env(safe-area-inset-top);
    --sab: env(safe-area-inset-bottom);
    --sal: env(safe-area-inset-left);
    --sar: env(safe-area-inset-right);
    
    /* Dynamic Island is ~59px, notch ~44px, safe-area captures both */
    --header-safe-top: max(20px, var(--sat));
  }
}

/* Fallback for non-iOS or no safe areas */
@supports not (padding-top: env(safe-area-inset-top)) {
  :root {
    --sat: 0px;
    --sab: 0px;
    --header-safe-top: 20px;
  }
}

/* 
  CRITICAL: Use 100dvh (dynamic viewport height), NOT 100vh
  100vh = static, includes URL bar when visible
  100dvh = dynamic, adjusts as chrome shows/hides
  In Capacitor WKWebView: both should work, but 100dvh is safer
*/
.capture-full-bleed {
  height: 100dvh;
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
}

/* Top controls with safe area padding */
.capture-top-controls {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding-top: calc(var(--header-safe-top) + 8px);
  padding-left: max(16px, var(--sal));
  padding-right: max(16px, var(--sar));
  z-index: 50;
  
  /* Graphite Glass backdrop */
  background: linear-gradient(
    to bottom,
    rgba(11, 15, 21, 0.9) 0%,
    rgba(11, 15, 21, 0.4) 60%,
    transparent 100%
  );
  backdrop-filter: blur(8px);
}

/* Bottom rail with home indicator safe area */
.capture-bottom-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: calc(var(--sab) + 16px);
  padding-left: max(16px, var(--sal));
  padding-right: max(16px, var(--sar));
  z-index: 50;
  
  background: linear-gradient(
    to top,
    rgba(11, 15, 21, 0.95) 0%,
    rgba(11, 15, 21, 0.6) 50%,
    transparent 100%
  );
}

/* Center overlays (Ghost button, Step indicators) */
.capture-center-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 40;
  pointer-events: none; /* Let touches pass through to camera where no controls */
}

.capture-center-overlay > * {
  pointer-events: auto; /* Re-enable on actual controls */
}
```

**Capacitor-Specific Configuration:**

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  ios: {
    // WKWebView configuration
    scrollEnabled: false, // Critical for full-bleed capture
    backgroundColor: '#0B0F15',
  },
  plugins: {
    // Ensure StatusBar doesn't add extra padding we handle ourselves
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B0F15',
      overlaysWebView: true, // Status bar overlays, we handle safe area
    },
  },
};
```

**Pitfalls & Solutions:**

| Pitfall | Cause | Fix |
|---------|-------|-----|
| Controls under Dynamic Island | `viewport-fit=auto` (default) | Must use `viewport-fit=cover` |
| Island covers controls even with safe area | `position: fixed` without padding | Add `padding-top: env(safe-area-inset-top)` |
| 100vh includes URL bar, shifts layout | Static viewport units | Use `100dvh` for full-bleed |
| Fixed positioning breaks on iOS scroll | WKWebView scrollEnabled | Set `scrollEnabled: false` in Capacitor config |
| Safe area not applied on Android | `env()` only works on iOS | Use CSS `@supports` fallback, Android uses 0px |
| Notch in landscape | `safe-area-inset-left` | Apply to left/right padding in landscape |

**iPhone Model Reference:**

| Model | Safe Area Top | Home Indicator |
|-------|--------------|----------------|
| iPhone 14 Pro/15 Pro (Dynamic Island) | ~59px | 34px |
| iPhone 12/13/14 (Notch) | ~44px | 34px |
| iPhone SE / 8 | 20px | 0px |
| iPhone 16 Pro (taller Island) | ~62px | 34px |

**Test Query:**
```typescript
// Test if safe areas are working
const testSafeAreas = () => {
  const sat = getComputedStyle(document.documentElement).getPropertyValue('--sat');
  console.log('Safe area top:', sat); // Should be > 40px on Dynamic Island devices
};
```

---

### 1b) ONE Capture Canvas: Feature-Prop Gating Pattern

**Strategy:** Single `CaptureCanvas` component with flow-specific configuration, NOT separate components.

```typescript
// lib/capture/types.ts
export type CaptureFlow = 'site-walk' | 'twin-360';

export interface CaptureCanvasConfig {
  flow: CaptureFlow;
  // Top bar controls
  showStepIndicator: boolean;
  showEndWalkButton: boolean;
  // Center overlays
  showGhostButton: boolean;
  showStepBadge: boolean;
  // Bottom rail
  showModeToggle: boolean;
  showQualityPill: boolean;
  // Behavior
  ghostModeDefault: boolean;
  allowPlanPinning: boolean;
}

export const captureConfigs: Record<CaptureFlow, CaptureCanvasConfig> = {
  'site-walk': {
    flow: 'site-walk',
    showStepIndicator: true,
    showEndWalkButton: true,
    showGhostButton: true,
    showStepBadge: true,
    showModeToggle: false, // Not applicable for photo-based
    showQualityPill: false,
    ghostModeDefault: false,
    allowPlanPinning: true,
  },
  'twin-360': {
    flow: 'twin-360',
    showStepIndicator: false,
    showEndWalkButton: false,
    showGhostButton: false,
    showStepBadge: false,
    showModeToggle: true, // Video/Photo toggle
    showQualityPill: true, // Draft/Medium/High
    ghostModeDefault: false,
    allowPlanPinning: false,
  },
};
```

```tsx
// components/capture/CaptureCanvas.tsx
'use client';

import { captureConfigs, CaptureFlow } from '@/lib/capture/types';
import { CameraFeed } from './CameraFeed';
import { CaptureTopBar } from './CaptureTopBar';
import { CaptureBottomRail } from './CaptureBottomRail';
import { GhostButton } from './GhostButton';
import { StepBadge } from './StepBadge';
import { cn } from '@/lib/utils';

interface CaptureCanvasProps {
  flow: CaptureFlow;
  projectId: string;
  walkId?: string;
  onCapture: (media: CaptureMedia) => void;
  onEndWalk?: () => void;
  className?: string;
}

export function CaptureCanvas({
  flow,
  projectId,
  walkId,
  onCapture,
  onEndWalk,
  className,
}: CaptureCanvasProps) {
  const config = captureConfigs[flow];
  const accent = flow === 'site-walk' ? 'green' : 'blue';

  return (
    <div className={cn('capture-full-bleed', className)}>
      {/* Camera layer (full bleed, behind everything) */}
      <CameraFeed className="absolute inset-0 z-0" />

      {/* Top controls with safe area */}
      <div className="capture-top-controls">
        <CaptureTopBar
          flow={flow}
          accent={accent}
          showStepIndicator={config.showStepIndicator}
          showEndWalkButton={config.showEndWalkButton}
          onEndWalk={onEndWalk}
        />
      </div>

      {/* Center overlays — flow-specific */}
      <div className="capture-center-overlay">
        {/* Site Walk: Ghost mode button */}
        {config.showGhostButton && (
          <GhostButton accent={accent} />
        )}

        {/* Site Walk: Step badge ("STEP 1") */}
        {config.showStepBadge && (
          <StepBadge step={1} accent={accent} />
        )}

        {/* Twin 360: Coverage ring (if applicable) */}
        {flow === 'twin-360' && <CoverageRing />}
      </div>

      {/* Bottom controls with safe area */}
      <div className="capture-bottom-controls">
        <CaptureBottomRail
          flow={flow}
          accent={accent}
          showModeToggle={config.showModeToggle}
          showQualityPill={config.showQualityPill}
          onCapture={onCapture}
        />
      </div>
    </div>
  );
}
```

```tsx
// components/capture/CaptureTopBar.tsx
interface CaptureTopBarProps {
  flow: CaptureFlow;
  accent: 'green' | 'blue';
  showStepIndicator: boolean;
  showEndWalkButton: boolean;
  onEndWalk?: () => void;
}

export function CaptureTopBar({
  flow,
  accent,
  showStepIndicator,
  showEndWalkButton,
  onEndWalk,
}: CaptureTopBarProps) {
  return (
    <div className="flex items-center justify-between h-14">
      {/* Back button — always present */}
      <button className="w-11 h-11 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur">
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>

      {/* Flow-specific center content */}
      <div className="flex-1 flex items-center justify-center gap-3">
        {showStepIndicator && (
          <span className="text-sm font-medium text-white/80">
            Stop 1
          </span>
        )}
      </div>

      {/* Flow-specific right content */}
      <div className="flex items-center gap-2">
        {showEndWalkButton && (
          <button
            onClick={onEndWalk}
            className={cn(
              'px-4 h-11 rounded-lg font-medium text-sm',
              accent === 'green' 
                ? 'bg-[#00E699] text-[#0B0F15]' 
                : 'bg-[#3D8EFF] text-white'
            )}
          >
            End walk
          </button>
        )}

        {/* Always show torch/settings */}
        <button className="w-11 h-11 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur">
          <Flashlight className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
```

**Why feature-props over separate components:**

| Approach | Pros | Cons |
|----------|------|------|
| **Feature props (chosen)** | Single source of truth, shared camera logic, easy to add flows | More conditionals in JSX |
| Separate `SiteWalkCapture`/`Twin360Capture` | "Clean" separation | Duplicated camera handling, sync bugs, divergent UX |
| Render props pattern | Flexible | Verbose, harder to trace |

**Usage:**

```tsx
// Site Walk route
<CaptureCanvas 
  flow="site-walk" 
  projectId={pid} 
  walkId={wid}
  onCapture={handlePhoto}
  onEndWalk={endWalk}
/>

// Twin 360 route  
<CaptureCanvas 
  flow="twin-360"
  projectId={pid}
  onCapture={handleClip}
/>
```

---

## Blocker 2: App-Shell Mobile Layout

### Problem Analysis

Current issues:
- Crowded header: `[logo][app-name][switcher][account]` in 52px
- Blank space from conflicting flex/padding
- Need: header-only → brand band → CTAs → grid → storage, NO dead space

### Solution: Stacked Rhythm Layout

```tsx
// components/shell-mobile/MobileAppHome.tsx
'use client';

import { useAppContext } from '@/hooks/useAppContext';
import { useAccent } from '@/hooks/useAccent';
import { LogoMark } from './LogoMark';
import { AppSwitcherCompact } from './AppSwitcherCompact';
import { AccountButton } from './AccountButton';
import { QuickActionGrid } from './QuickActionGrid';
import { StorageCard } from './StorageCard';
import { cn } from '@/lib/utils';

interface MobileAppHomeProps {
  app: 'dashboard' | 'site-walk' | 'twin-360';
}

export function MobileAppHome({ app }: MobileAppHomeProps) {
  const accent = useAccent(app);
  const config = appHomeConfigs[app];

  return (
    <div className="min-h-[100dvh] bg-graphite-canvas flex flex-col">
      {/* 
        HEADER: 52px tall, fixed at top
        Only logo, switcher (icon-only), account
        NO app name here
      */}
      <header className="h-[52px] px-4 flex items-center justify-between shrink-0 z-50 bg-graphite-canvas/95 backdrop-blur-sm">
        {/* Logo only — 44px touch target */}
        <LogoMark className="w-10 h-10" />

        {/* Compact switcher — icon-only pills */}
        <AppSwitcherCompact currentApp={app} />

        {/* Account — 44px */}
        <AccountButton />
      </header>

      {/* 
        SCROLLABLE CONTENT: flex-1 with natural flow
        No forced gaps, content determines rhythm
      */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* 
          BRAND BAND: Prominent app identification
          - Full width, 72px tall
          - IBM Plex Mono uppercase wordmark
          - Accent color indicator
          - No wasted space above/below
        */}
        <div className="px-4 pt-2 pb-4">
          <div 
            className={cn(
              'h-[72px] rounded-xl flex flex-col items-center justify-center',
              'glass-panel border-l-4',
              accent.borderClass
            )}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-graphite-400">
              Slate360
            </span>
            <h1 className={cn(
              'text-2xl font-bold tracking-tight mt-1',
              accent.textClass
            )}>
              {config.title}
            </h1>
            <p className="text-xs text-graphite-400 mt-0.5">
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* 
          HERO CTAs: 1-2 primary actions
          - Large touch targets (72px)
          - Stacked vertically on narrow screens
          - Side-by-side if space permits
          - NO gap above (tight to brand band)
        */}
        <div className="px-4">
          <div className="flex flex-col gap-3">
            {/* Primary CTA */}
            <button 
              className={cn(
                'h-[72px] rounded-xl flex items-center gap-4 px-5',
                'active:scale-[0.98] transition-transform',
                accent.bgClass
              )}
            >
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <config.primaryIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <span className="block text-lg font-semibold text-white">
                  {config.primaryAction}
                </span>
                <span className="block text-sm text-white/70">
                  {config.primarySubtext}
                </span>
              </div>
              <ChevronRight className="w-6 h-6 text-white/50" />
            </button>

            {/* Secondary CTA (if applicable) */}
            {config.secondaryAction && (
              <button 
                className={cn(
                  'h-[72px] rounded-xl flex items-center gap-4 px-5',
                  'bg-white/[0.04] border border-white/[0.10]',
                  'active:scale-[0.98] transition-transform'
                )}
              >
                <div className="w-12 h-12 rounded-lg bg-white/[0.08] flex items-center justify-center">
                  <config.secondaryIcon className="w-6 h-6 text-graphite-300" />
                </div>
                <div className="flex-1 text-left">
                  <span className="block text-lg font-semibold text-white">
                    {config.secondaryAction}
                  </span>
                  <span className="block text-sm text-graphite-400">
                    {config.secondarySubtext}
                  </span>
                </div>
                <ChevronRight className="w-6 h-6 text-graphite-500" />
              </button>
            )}
          </div>
        </div>

        {/* 
          QUICK ACTION GRID: 4-6 secondary actions
          - 2-column grid
          - 80px minimum height (touch-friendly)
          - Icon + label centered
          - Tight to CTAs above (pt-4, not mt-auto)
        */}
        <div className="px-4 pt-4">
          <h2 className="label-mono mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {config.quickActions.map((action) => (
              <button
                key={action.id}
                className={cn(
                  'h-20 rounded-xl flex flex-col items-center justify-center gap-2',
                  'bg-white/[0.04] border border-white/[0.06]',
                  'active:bg-white/[0.08] transition-colors'
                )}
              >
                <action.icon className="w-6 h-6 text-graphite-300" />
                <span className="text-sm font-medium text-graphite-200">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 
          STORAGE CARD: Usage indicator
          - Compact, 64px height
          - Progress bar + text
          - Tight to grid above
        */}
        <div className="px-4 pt-4 pb-6">
          <StorageCard />
        </div>

        {/* 
          BOTTOM SAFE AREA PADDING: 
          Only padding needed — NO mt-auto, NO forced gaps
          Content naturally fills space
        */}
        <div className="h-[calc(env(safe-area-inset-bottom,0px)+16px)] shrink-0" />
      </main>
    </div>
  );
}
```

### Config Per App

```typescript
// lib/shell/app-home-config.ts
import { 
  Camera, Box, FolderOpen, Users, Calendar, 
  Settings, FileText, History, Plus 
} from 'lucide-react';

export const appHomeConfigs = {
  'dashboard': {
    title: 'Dashboard',
    subtitle: 'Manage projects and team',
    accent: 'neutral',
    primaryAction: 'New Project',
    primarySubtext: 'Start a documentation project',
    primaryIcon: Plus,
    secondaryAction: 'Browse Files',
    secondarySubtext: 'Open SlateDrop',
    secondaryIcon: FolderOpen,
    quickActions: [
      { id: 'projects', label: 'Projects', icon: FolderOpen },
      { id: 'team', label: 'Team', icon: Users },
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
  
  'site-walk': {
    title: 'Site Walk',
    subtitle: 'Field documentation',
    accent: 'green',
    primaryAction: 'New Walk',
    primarySubtext: 'Start documenting a site',
    primaryIcon: Camera,
    secondaryAction: 'Continue Walk',
    secondarySubtext: 'Resume in-progress',
    secondaryIcon: History,
    quickActions: [
      { id: 'walks', label: 'My Walks', icon: FileText },
      { id: 'plans', label: 'Plans', icon: FolderOpen },
      { id: 'deliver', label: 'Deliverables', icon: FileText },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
  
  'twin-360': {
    title: 'Twin 360',
    subtitle: '3D capture & models',
    accent: 'blue',
    primaryAction: 'New Capture',
    primarySubtext: 'Start a 3D scan',
    primaryIcon: Camera,
    secondaryAction: 'View Models',
    secondarySubtext: 'Browse captures',
    secondaryIcon: Box,
    quickActions: [
      { id: 'clips', label: 'Clips', icon: FolderOpen },
      { id: 'models', label: 'Models', icon: Box },
      { id: 'deliver', label: 'Deliverables', icon: FileText },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
};
```

### Accent Hook

```typescript
// hooks/useAccent.ts
export function useAccent(app: string) {
  const accents = {
    neutral: {
      textClass: 'text-graphite-100',
      bgClass: 'bg-graphite-600',
      borderClass: 'border-graphite-400',
    },
    green: {
      textClass: 'text-[#00E699]',
      bgClass: 'bg-[#00E699]',
      borderClass: 'border-[#00E699]',
    },
    blue: {
      textClass: 'text-[#3D8EFF]',
      bgClass: 'bg-[#3D8EFF]',
      borderClass: 'border-[#3D8EFF]',
    },
  };
  
  return accents[app as keyof typeof accents] || accents.neutral;
}
```

### Key Layout Principles

| Principle | Implementation | Why |
|-----------|---------------|-----|
| **No `mt-auto`** | Content flows naturally with `pt-*` | Eliminates dead space between sections |
| **Tight vertical rhythm** | `pt-2`, `pt-4`, `pb-6` — explicit, small | Native app density, no voids |
| **Flex column, not justify-between** | `flex-col` with natural height | Prevents forced spacing |
| **Touch targets** | `h-[72px]` for CTAs, `h-20` (80px) for grid | Field accessibility |
| **Brand band prominence** | 72px tall, wordmark + title + subtitle | Clear app identity without header clutter |
| **Compact header** | 52px, logo + icon-switcher + account only | Maximum content space below |

---

## Summary

### Capture Screen Fix

1. **Viewport:** `viewport-fit=cover` + `100dvh`
2. **CSS:** `env(safe-area-inset-top)` for Dynamic Island clearance
3. **Pattern:** Feature-prop gating — single `CaptureCanvas`, flow-specific config
4. **Test:** iPhone 14 Pro/15 Pro simulators (Dynamic Island), iPhone SE (no notch)

### Mobile Shell Fix

1. **Header:** 52px, logo + switcher + account only
2. **Brand band:** 72px below header, app name prominent
3. **Content flow:** `flex-col` with `pt-*` spacing, NO `mt-auto`
4. **CTAs:** 72px touch targets, stacked
5. **Grid:** 2-column, 80px minimum
6. **Bottom:** Safe area padding only

*Delivered: June 30, 2026*
