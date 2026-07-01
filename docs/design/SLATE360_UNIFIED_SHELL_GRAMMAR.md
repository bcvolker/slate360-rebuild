# Slate360 Unified Shell Grammar
## One Ecosystem, Three Apps, One Accent Difference

**Design Philosophy:** Site Walk, Twin 360, and the Dashboard are not separate products — they are workspaces within one unified Slate360 ecosystem. The user should feel continuous as they move between them, with only the accent color signaling context shift.

**Form Factor Rule:**
- **Phone:** Focused capture — one decision per screen, 48–72px touch targets
- **Desktop:** Upload + author + management — rail + center + context panes, fills space, never stretched phone UI

**Design System: Graphite Glass**
- Canvas: `#0B0F15`
- Glass: `bg-white/[0.04] backdrop-blur-xl border-white/10`
- Radius: `rounded-xl` (12px)
- Labels: `IBM Plex Mono uppercase tracking-wider text-xs`
- Accents: Green `#00E699` (Site Walk) / Blue `#3D8EFF` (Twin 360) — **interactive states only**
- Bans: Amber, glow effects, `rounded-full`, hardcoded hex (use tokens)

---

## 1. Unified Information Architecture

### Three App Roots

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  SLATE360 ECOSYSTEM                                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   DASHBOARD     │  │   SITE WALK     │  │   TWIN 360      │                  │
│  │   (Neutral)     │  │   (Green)       │  │   (Blue)        │                  │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤                  │
│  │ Home            │  │ Capture         │  │ Capture         │                  │
│  │ Projects        │  │ Walks           │  │ Clips           │                  │
│  │ SlateDrop       │  │ Deliverables    │  │ Models          │                  │
│  │ Contacts        │  │ Plans*          │  │ Deliverables    │                  │
│  │ Calendar        │  │                 │  │                 │                  │
│  │ Deliverables    │  │                 │  │                 │                  │
│  │ Settings        │  │                 │  │                 │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                 │
│  *Pro tier — walks-with-plans, 360-on-plans                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Navigation Hierarchy

**Primary (always visible):**
- Dashboard / Site Walk / Twin 360 — top-level app switcher

**Secondary (left rail):**
- Contextual to active app

**Tertiary (center workspace):**
- Content, lists, editors

**Quaternary (right context pane):**
- Selection details, quick actions

---

## 2. Desktop Layout: 3-Pane Grammar

### Canonical Desktop Shell (1440px+)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  TOP BAR (56px)                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  LOGO    [Dashboard][Site Walk│][Twin 360]    ⌘K    Projects ▼    👤    [+]            │ │
│  └────────────────────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ┌─────────────┐  ┌──────────────────────────────────────────────┐  ┌─────────────────────┐ │
│  │             │  │                                              │  │                     │ │
│  │  LEFT RAIL  │  │           CENTER WORKSPACE                   │  │    RIGHT CONTEXT    │ │
│  │  (72px →    │  │                                              │  │    (320px,          │ │
│  │   220px)    │  │                                              │  │    collapsible)     │ │
│  │             │  │                                              │  │                     │ │
│  │  ─────────  │  │                                              │  │                     │ │
│  │  NAV        │  │   Content adapts to app:                     │  │  Selection details  │ │
│  │  SECTIONS   │  │                                              │  │  Quick actions      │ │
│  │             │  │   • Project grid/list                        │  │  Metadata           │ │
│  │  • Home     │  │   • SlateDrop explorer                       │  │  Related items      │ │
│  │  • Projects │  │   • Walk/clip timeline                       │  │                     │ │
│  │  • Files    │  │   • Deliverable editor                       │  │  [◀ collapse]       │ │
│  │  • Contacts │  │   • Calendar                                 │  │                     │ │
│  │  • Calendar │  │                                              │  │                     │ │
│  │  • Deliver  │  │                                              │  │                     │ │
│  │             │  │                                              │  │                     │ │
│  │  ─────────  │  │                                              │  │                     │ │
│  │  APP-SPEC   │  │                                              │  │                     │ │
│  │  (dynamic)  │  │                                              │  │                     │ │
│  │             │  │                                              │  │                     │ │
│  │  Site Walk: │  │                                              │  │                     │ │
│  │  • Capture  │  │                                              │  │                     │ │
│  │  • Walks    │  │                                              │  │                     │ │
│  │  • Plans    │  │                                              │  │                     │ │
│  │             │  │                                              │  │                     │ │
│  │  Twin 360:  │  │                                              │  │                     │ │
│  │  • Capture  │  │                                              │  │                     │ │
│  │  • Clips    │  │                                              │  │                     │ │
│  │  • Models   │  │                                              │  │                     │ │
│  │             │  │                                              │  │                     │ │
│  │  ─────────  │  │                                              │  │                     │ │
│  │  SYSTEM     │  │                                              │  │                     │ │
│  │  • Settings │  │                                              │  │                     │ │
│  │  • Help ⌘?  │  │                                              │  │                     │ │
│  │             │  │                                              │  │                     │ │
│  └─────────────┘  └──────────────────────────────────────────────┘  └─────────────────────┘ │
│                                                                                             │
│  ◄──── 72-220 ──►  ◄────────── fluid center ──────────────►  ◄──── 320 (optional) ────►  │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Layout Tokens (Tailwind)

```typescript
// lib/shell/layout-tokens.ts
export const layoutTokens = {
  topBar: {
    height: 'h-14', // 56px
    padding: 'px-4',
    gap: 'gap-4',
  },
  leftRail: {
    widthCollapsed: 'w-[72px]',
    widthExpanded: 'w-[220px]',
    transition: 'transition-all duration-200 ease-out',
    itemHeight: 'h-12', // 48px touch-friendly
    iconSize: 'w-6 h-6',
  },
  centerWorkspace: {
    padding: 'p-6',
    gap: 'gap-6',
  },
  rightContext: {
    width: 'w-80', // 320px
    padding: 'p-4',
    gap: 'gap-4',
  },
  glass: {
    base: 'bg-white/[0.04] backdrop-blur-xl',
    border: 'border border-white/[0.10]',
    radius: 'rounded-xl',
    radiusSm: 'rounded-lg', // 8px for nested
  },
  typography: {
    label: 'font-mono text-xs uppercase tracking-wider',
    title: 'text-lg font-semibold',
    body: 'text-sm',
    caption: 'text-xs text-slate-400',
  },
} as const;
```

---

## 3. Top Bar & App Switcher

### App Switcher Component

```tsx
// components/shell/AppSwitcher.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface AppTab {
  id: 'dashboard' | 'site-walk' | 'twin-360';
  label: string;
  href: string;
  accentClass: string;
}

const apps: AppTab[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    href: '/app',
    accentClass: 'text-slate-100' // Neutral
  },
  { 
    id: 'site-walk', 
    label: 'Site Walk', 
    href: '/app/site-walk',
    accentClass: 'text-[#00E699]' // Green
  },
  { 
    id: 'twin-360', 
    label: 'Twin 360', 
    href: '/app/twin-360',
    accentClass: 'text-[#3D8EFF]' // Blue
  },
];

export function AppSwitcher() {
  const pathname = usePathname();
  
  // Determine active app
  const activeApp = apps.find(app => {
    if (app.id === 'dashboard') return pathname === '/app' || pathname.startsWith('/app/projects') || pathname.startsWith('/app/slatedrop');
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
              isActive ? app.accentClass : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {app.label}
            
            {/* Active indicator — underline only, accent color */}
            {isActive && (
              <span 
                className={cn(
                  'absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full',
                  app.id === 'dashboard' && 'bg-slate-400',
                  app.id === 'site-walk' && 'bg-[#00E699]',
                  app.id === 'twin-360' && 'bg-[#3D8EFF]'
                )} 
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
```

### Complete TopBar Component

```tsx
// components/shell/TopBar.tsx
import { AppSwitcher } from './AppSwitcher';
import { CommandPaletteTrigger } from './CommandPaletteTrigger';
import { ProjectSwitcher } from './ProjectSwitcher';
import { UserMenu } from './UserMenu';
import { CreateButton } from './CreateButton';
import { Logo } from './Logo';

export function TopBar() {
  return (
    <header className="h-14 px-4 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-[#0B0F15]/80 backdrop-blur-xl sticky top-0 z-50">
      {/* Left: Logo + App Switcher */}
      <div className="flex items-center gap-4">
        <Logo />
        <AppSwitcher />
      </div>
      
      {/* Center: Command Palette */}
      <div className="flex-1 max-w-md">
        <CommandPaletteTrigger />
      </div>
      
      {/* Right: Context + User */}
      <div className="flex items-center gap-3">
        <ProjectSwitcher />
        <CreateButton />
        <UserMenu />
      </div>
    </header>
  );
}
```

### Command Palette Trigger

```tsx
// components/shell/CommandPaletteTrigger.tsx
'use client';

import { useEffect } from 'react';
import { Search } from 'lucide-react';
import { useCommandPalette } from '@/hooks/useCommandPalette';

export function CommandPaletteTrigger() {
  const { open } = useCommandPalette();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);
  
  return (
    <button
      onClick={open}
      className="w-full h-9 flex items-center gap-3 px-3 rounded-lg bg-white/[0.04] border border-white/[0.10] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all group"
    >
      <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-300" />
      <span className="flex-1 text-left text-sm text-slate-400 group-hover:text-slate-300">
        Search or jump to…
      </span>
      <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500 bg-white/[0.06] border border-white/[0.10]">
        ⌘K
      </kbd>
    </button>
  );
}
```

---

## 4. Left Rail Navigation

### Collapsible Rail with App Sections

```tsx
// components/shell/LeftRail.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Home, FolderKanban, FolderOpen, Users, Calendar, 
  Send, Settings, HelpCircle, Camera, Video, 
  ChevronRight 
} from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  section: 'shared' | 'site-walk' | 'twin-360';
  shortcut?: string;
}

const navItems: NavItem[] = [
  // Shared surfaces
  { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" />, href: '/app', section: 'shared' },
  { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-5 h-5" />, href: '/app/projects', section: 'shared' },
  { id: 'slatedrop', label: 'Files', icon: <FolderOpen className="w-5 h-5" />, href: '/app/slatedrop', section: 'shared' },
  { id: 'contacts', label: 'Contacts', icon: <Users className="w-5 h-5" />, href: '/app/contacts', section: 'shared' },
  { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" />, href: '/app/calendar', section: 'shared' },
  { id: 'deliverables', label: 'Deliverables', icon: <Send className="w-5 h-5" />, href: '/app/deliverables', section: 'shared' },
  
  // Site Walk specific
  { id: 'sw-capture', label: 'Capture', icon: <Camera className="w-5 h-5" />, href: '/app/site-walk/capture', section: 'site-walk' },
  { id: 'sw-walks', label: 'Walks', icon: <Video className="w-5 h-5" />, href: '/app/site-walk/walks', section: 'site-walk' },
  
  // Twin 360 specific
  { id: 't3-capture', label: 'Capture', icon: <Camera className="w-5 h-5" />, href: '/app/twin-360/capture', section: 'twin-360' },
  { id: 't3-clips', label: 'Clips', icon: <Video className="w-5 h-5" />, href: '/app/twin-360/clips', section: 'twin-360' },
  
  // System
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, href: '/app/settings', section: 'shared', shortcut: '⌘,' },
  { id: 'help', label: 'Help', icon: <HelpCircle className="w-5 h-5" />, href: '/app/help', section: 'shared', shortcut: '⌘?' },
];

export function LeftRail() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const { activeApp } = useAppContext();
  
  // Filter items based on active app
  const visibleItems = navItems.filter(item => 
    item.section === 'shared' || item.section === activeApp
  );
  
  const sharedItems = visibleItems.filter(i => i.section === 'shared' && 
    ['home', 'projects', 'slatedrop', 'contacts', 'calendar', 'deliverables'].includes(i.id)
  );
  const appSpecificItems = visibleItems.filter(i => i.section !== 'shared');
  const systemItems = visibleItems.filter(i => ['settings', 'help'].includes(i.id));
  
  return (
    <aside 
      className={cn(
        'h-[calc(100vh-3.5rem)] flex flex-col bg-[#0B0F15] border-r border-white/[0.06] transition-all duration-200',
        isExpanded ? 'w-[220px]' : 'w-[72px]'
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Main nav */}
      <nav className="flex-1 py-4 px-2 space-y-6 overflow-y-auto">
        {/* Shared surfaces */}
        <NavGroup 
          items={sharedItems} 
          pathname={pathname} 
          isExpanded={isExpanded}
          accent={activeApp === 'site-walk' ? '#00E699' : activeApp === 'twin-360' ? '#3D8EFF' : undefined}
        />
        
        {/* App-specific divider */}
        {appSpecificItems.length > 0 && (
          <>
            <div className={cn('h-px bg-white/[0.08]', isExpanded ? 'mx-3' : 'mx-2')} />
            <NavGroup 
              items={appSpecificItems} 
              pathname={pathname} 
              isExpanded={isExpanded}
              accent={activeApp === 'site-walk' ? '#00E699' : '#3D8EFF'}
            />
          </>
        )}
      </nav>
      
      {/* System */}
      <div className="py-4 px-2 border-t border-white/[0.06]">
        <NavGroup 
          items={systemItems} 
          pathname={pathname} 
          isExpanded={isExpanded}
        />
      </div>
      
      {/* Expand indicator (visible when collapsed) */}
      {!isExpanded && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 p-1">
          <ChevronRight className="w-3 h-3 text-slate-600" />
        </div>
      )}
    </aside>
  );
}

function NavGroup({ 
  items, 
  pathname, 
  isExpanded,
  accent 
}: { 
  items: NavItem[]; 
  pathname: string; 
  isExpanded: boolean;
  accent?: string;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                'hover:bg-white/[0.06]',
                isActive && 'bg-white/[0.08]',
                isActive && accent && `text-[${accent}]`,
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              )}
              style={isActive && accent ? { color: accent } : undefined}
            >
              <span className={cn(
                'transition-colors',
                isActive && accent ? 'text-current' : 'text-slate-400 group-hover:text-slate-300'
              )}>
                {item.icon}
              </span>
              
              {isExpanded && (
                <>
                  <span className="flex-1 text-sm font-medium truncate">
                    {item.label}
                  </span>
                  {item.shortcut && (
                    <kbd className="text-[10px] font-mono text-slate-500 px-1 py-0.5 rounded bg-white/[0.06]">
                      {item.shortcut}
                    </kbd>
                  )}
                </>
              )}
              
              {/* Active indicator dot (when collapsed) */}
              {!isExpanded && isActive && (
                <span 
                  className="absolute right-2 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: accent || '#94A3B8' }}
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

---

## 5. Action/Label Taxonomy (One Name Per Action)

### Canonical Action Names

| Action | Canonical Label | Contexts | Icon |
|--------|-----------------|----------|------|
| Create new project | **"New Project"** | Dashboard, Projects list | Plus in square |
| Create new walk | **"New Walk"** | Site Walk, Walks list | Camera |
| Create new twin capture | **"New Capture"** | Twin 360, Clips list | Camera (differentiated by app context) |
| Create deliverable | **"Create Deliverable"** | Anywhere | Send |
| Upload files | **"Upload"** | SlateDrop, Clips | Upload cloud |
| Start recording | **"Record"** / **"Stop"** | Capture HUD | Record circle / Square |
| Finish / Complete | **"Done"** | Capture flows | Checkmark |
| Cancel / Go back | **"Back"** | Navigation | Chevron left |
| Save changes | **"Save"** | Editors | — |
| Delete | **"Delete"** | Destructive | Trash |
| Share | **"Share"** | Deliverables, files | Share |
| Download | **"Download"** | Files, deliverables | Download |
| Edit | **"Edit"** | All editable | Pencil |
| View details | **"View"** / **"Open"** | Lists | Arrow right |
| Search | **"Search"** | Command palette, filters | Search |
| Filter | **"Filter"** | Lists, tables | Filter |
| Sort | **"Sort"** | Lists, tables | Arrow up/down |
| Refresh / Sync | **"Sync"** | Offline contexts | Refresh cw |

### Button Hierarchy

```tsx
// components/ui/ActionButton.tsx
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  accent?: 'green' | 'blue' | 'neutral';
  icon?: React.ReactNode;
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className, variant = 'secondary', size = 'md', accent = 'neutral', icon, children, ...props }, ref) => {
    const accentClass = {
      green: 'text-[#00E699] hover:text-[#00E699] hover:bg-[#00E699]/10',
      blue: 'text-[#3D8EFF] hover:text-[#3D8EFF] hover:bg-[#3D8EFF]/10',
      neutral: 'text-white hover:bg-white/[0.08]',
    }[accent];
    
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-lg',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          
          // Variants
          variant === 'primary' && cn(
            'px-4 py-2.5 text-sm',
            accent === 'green' && 'bg-[#00E699] text-[#0B0F15] hover:bg-[#00E699]/90',
            accent === 'blue' && 'bg-[#3D8EFF] text-white hover:bg-[#3D8EFF]/90',
            accent === 'neutral' && 'bg-white text-[#0B0F15] hover:bg-white/90',
          ),
          
          variant === 'secondary' && cn(
            'px-4 py-2.5 text-sm border border-white/[0.15]',
            'hover:border-white/[0.25]',
            accentClass
          ),
          
          variant === 'ghost' && cn(
            'px-3 py-2 text-sm',
            accentClass
          ),
          
          variant === 'danger' && 
            'px-4 py-2.5 text-sm text-red-400 border border-red-500/30 hover:bg-red-500/10',
          
          // Sizes
          size === 'sm' && 'text-xs px-3 py-2',
          size === 'lg' && 'text-base px-6 py-3',
          
          className
        )}
        {...props}
      >
        {icon && <span className="w-4 h-4">{icon}</span>}
        {children}
      </button>
    );
  }
);
ActionButton.displayName = 'ActionButton';
```

---

## 6. SlateDrop in the Shell

### Desktop: Finder/Explorer-Class

```tsx
// app/(dashboard)/app/slatedrop/page.tsx
import { SlateDropExplorer } from '@/components/slatedrop/SlateDropExplorer';

export default function SlateDropPage() {
  return (
    <div className="h-full flex flex-col">
      <SlateDropHeader />
      
      <div className="flex-1 flex min-h-0">
        {/* Left: Folder tree */}
        <SlateDropFolderTree className="w-56 border-r border-white/[0.06]" />
        
        {/* Center: Items grid/list */}
        <SlateDropItems className="flex-1" />
        
        {/* Right: Preview pane */}
        <SlateDropPreview className="w-80 border-l border-white/[0.06]" />
      </div>
    </div>
  );
}
```

### Mobile: Focused Stack

```tsx
// Mobile: One screen at a time
// /app/slatedrop → Folder list
// /app/slatedrop/[folderId] → Items list  
// /app/slatedrop/[folderId]/[itemId] → File detail + preview

// components/slatedrop/mobile/FolderList.tsx
export function MobileFolderList() {
  return (
    <div className="h-full flex flex-col bg-[#0B0F15]">
      <header className="px-4 py-3 border-b border-white/[0.06]">
        <h1 className="text-lg font-semibold">Files</h1>
      </header>
      
      <div className="flex-1 overflow-y-auto">
        {/* Recent, Starred, Projects */}
        <QuickAccessSection />
        
        {/* Folder list */}
        <FolderListItems />
      </div>
      
      {/* Floating action */}
      <UploadFAB />
    </div>
  );
}
```

### SlateDrop Header (Shared)

```tsx
// components/slatedrop/SlateDropHeader.tsx
import { Breadcrumbs } from './Breadcrumbs';
import { ViewToggle } from './ViewToggle';
import { SortDropdown } from './SortDropdown';
import { SearchField } from './SearchField';
import { ActionButton } from '@/components/ui/ActionButton';
import { Upload, Plus } from 'lucide-react';

export function SlateDropHeader() {
  return (
    <header className="h-14 px-4 flex items-center justify-between gap-4 border-b border-white/[0.06]">
      <div className="flex items-center gap-4">
        <Breadcrumbs />
      </div>
      
      <div className="flex items-center gap-3">
        <SearchField />
        <ViewToggle />
        <SortDropdown />
        
        <div className="h-6 w-px bg-white/[0.10] mx-1" />
        
        <ActionButton variant="secondary" icon={<Upload className="w-4 h-4" />}>
          Upload
        </ActionButton>
        <ActionButton 
          variant="primary" 
          icon={<Plus className="w-4 h-4" />}
        >
          New Folder
        </ActionButton>
      </div>
    </header>
  );
}
```

---

## 7. Component Structure

### Shell Components Tree

```
components/shell/
├── Shell.tsx                    # Root shell with providers
├── TopBar.tsx                   # Logo, app switcher, command palette, user
├── AppSwitcher.tsx              # Dashboard/Site Walk/Twin 360 tabs
├── CommandPaletteTrigger.tsx    # ⌘K search trigger
├── CommandPalette.tsx           # Full command palette modal
├── LeftRail.tsx                 # Collapsible navigation rail
├── CenterWorkspace.tsx          # Scrollable content area
├── RightContextPane.tsx         # Collapsible details pane
├── CreateButton.tsx             # Universal create menu
├── ProjectSwitcher.tsx          # Current project dropdown
├── UserMenu.tsx                 # Avatar + settings dropdown
└── Logo.tsx                     # Slate360 wordmark

components/slatedrop/
├── SlateDropExplorer.tsx        # 3-pane desktop layout
├── SlateDropHeader.tsx          # Breadcrumbs, view, sort, search
├── SlateDropFolderTree.tsx      # Left pane folder tree
├── SlateDropItems.tsx           # Center pane grid/list
├── SlateDropPreview.tsx         # Right pane preview
├── SlateDropUploadQueue.tsx     # Bottom upload toasts
├── Breadcrumbs.tsx
├── ViewToggle.tsx
├── SortDropdown.tsx
├── SearchField.tsx
└── mobile/
    ├── MobileFolderList.tsx
    ├── MobileItemList.tsx
    ├── MobileFileDetail.tsx
    └── UploadFAB.tsx

hooks/
├── useAppContext.tsx            # Active app (dashboard/site-walk/twin-360)
├── useCommandPalette.tsx        # ⌘K state
├── useProjectContext.tsx        # Current project
└── useShellLayout.tsx           # Rail expanded/collapsed, context pane open

lib/shell/
├── layout-tokens.ts             # Spacing, sizes
├── accent-tokens.ts             // Color tokens per app
├── action-taxonomy.ts           // Canonical action definitions
└── navigation-tree.ts           // Route definitions by app
```

### Accent Token System

```typescript
// lib/shell/accent-tokens.ts
export type AppAccent = 'neutral' | 'green' | 'blue';

export const accentTokens = {
  neutral: {
    primary: 'text-slate-100',
    bg: 'bg-slate-100',
    bgHover: 'hover:bg-white/[0.08]',
    border: 'border-slate-400',
    ring: 'ring-slate-400',
  },
  green: {
    primary: 'text-[#00E699]',
    bg: 'bg-[#00E699]',
    bgSubtle: 'bg-[#00E699]/10',
    bgHover: 'hover:bg-[#00E699]/20',
    border: 'border-[#00E699]/50',
    ring: 'ring-[#00E699]',
    textOnBg: 'text-[#0B0F15]', // For buttons
  },
  blue: {
    primary: 'text-[#3D8EFF]',
    bg: 'bg-[#3D8EFF]',
    bgSubtle: 'bg-[#3D8EFF]/10',
    bgHover: 'hover:bg-[#3D8EFF]/20',
    border: 'border-[#3D8EFF]/50',
    ring: 'ring-[#3D8EFF]',
    textOnBg: 'text-white',
  },
} as const;

// Hook for current accent
export function useAccent() {
  const { activeApp } = useAppContext();
  
  const accentMap = {
    dashboard: 'neutral' as const,
    'site-walk': 'green' as const,
    'twin-360': 'blue' as const,
  };
  
  return accentTokens[accentMap[activeApp]];
}
```

### Shell Root Component

```tsx
// components/shell/Shell.tsx
'use client';

import { TopBar } from './TopBar';
import { LeftRail } from './LeftRail';
import { RightContextPane } from './RightContextPane';
import { CommandPalette } from './CommandPalette';
import { AppProvider } from '@/providers/AppProvider';
import { cn } from '@/lib/utils';

interface ShellProps {
  children: React.ReactNode;
  showContextPane?: boolean;
}

export function Shell({ children, showContextPane = true }: ShellProps) {
  return (
    <AppProvider>
      <div className="min-h-screen bg-[#0B0F15] text-slate-200">
        <TopBar />
        
        <div className="flex h-[calc(100vh-3.5rem)]">
          <LeftRail />
          
          <main className="flex-1 flex min-w-0 overflow-hidden">
            {/* Center workspace */}
            <div className={cn(
              'flex-1 flex flex-col min-w-0 overflow-hidden',
              'bg-[#0B0F15]'
            )}>
              {children}
            </div>
            
            {/* Right context pane */}
            {showContextPane && <RightContextPane />}
          </main>
        </div>
        
        <CommandPalette />
      </div>
    </AppProvider>
  );
}
```

---

## 8. Capture→Review→Deliver Spine

### Consistent Flow Across Apps

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CAPTURE → REVIEW → DELIVER (SPINE)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  SITE WALK                              TWIN 360                                │
│  (Green accent)                         (Blue accent)                         │
│                                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     ┌──────────┐  ┌──────────┐        │
│  │  CAPTURE │→│  REVIEW  │→│ DELIVER  │     │  CAPTURE │→│  REVIEW  │→…       │
│  │   Walk   │  │   Walk   │  │  Share   │     │  Clips   │  │  Model   │        │
│  └──────────┘  └──────────┘  └──────────┘     └──────────┘  └──────────┘        │
│       ↑                                               ↑                         │
│  ┌────┴────┐                                       ┌──┴──┐                      │
│  │Project  │                                       │Submit│                     │
│  │Picker   │                                       │Panel │                     │
│  │(if any) │                                       └──────┘                     │
│  └─────────┘                                                                    │
│                                                                                 │
│  Action labels:                         Action labels:                          │
│  • "New Walk"                            • "New Capture"                        │
│  • "Record" / "Stop"                     • "Record" / "Stop"                      │
│  • "Done" (end walk)                     • "Finish" (submit)                    │
│  • "Review Walk"                         • "Review Model"                         │
│  • "Create Deliverable"                  • "Create Deliverable"                 │
│  • "Share"                               • "Share"                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Shared Components

```tsx
// components/capture/CaptureHeader.tsx
interface CaptureHeaderProps {
  mode: 'site-walk' | 'twin-360';
  title: string;
  subtitle?: string;
  onBack: () => void;
  accent: 'green' | 'blue';
}

export function CaptureHeader({ mode, title, subtitle, onBack, accent }: CaptureHeaderProps) {
  const accentColor = accent === 'green' ? '#00E699' : '#3D8EFF';
  
  return (
    <header className="absolute top-0 left-0 right-0 z-20 px-4 pt-safe-top">
      <div className="h-14 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-white">{title}</span>
          {subtitle && (
            <span className="text-xs text-white/60">{subtitle}</span>
          )}
        </div>
        
        <div className="w-16" /> {/* Spacer for balance */}
      </div>
    </header>
  );
}

// components/capture/ShutterButton.tsx
interface ShutterButtonProps {
  isRecording: boolean;
  onClick: () => void;
  accent: 'green' | 'blue';
  disabled?: boolean;
}

export function ShutterButton({ isRecording, onClick, accent, disabled }: ShutterButtonProps) {
  const accentColor = accent === 'green' ? '#00E699' : '#3D8EFF';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-[72px] h-[72px] rounded-full flex items-center justify-center',
        'transition-all duration-200',
        disabled && 'opacity-50 cursor-not-allowed',
        !isRecording && `border-4 border-[${accentColor}]`,
        isRecording && 'bg-red-500'
      )}
      style={{
        borderColor: !isRecording ? accentColor : undefined,
      }}
    >
      <div className={cn(
        'rounded-full transition-all duration-200',
        isRecording ? 'w-6 h-6 bg-white' : 'w-14 h-14'
      )} />
    </button>
  );
}
```

---

## 9. Tailwind Config Extensions

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  // ... existing config
  theme: {
    extend: {
      colors: {
        // Graphite Glass canvas
        graphite: {
          DEFAULT: '#0B0F15',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#0B0F15', // Canvas
        },
        // Accents
        slate: {
          primary: '#00E699',   // Site Walk
          secondary: '#3D8EFF', // Twin 360
        },
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'SF Mono', 'Monaco', 'monospace'],
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '14': '3.5rem',   // 56px top bar
        '18': '4.5rem',   // 72px rail collapsed
        '55': '13.75rem', // 220px rail expanded
        '80': '20rem',    // 320px context pane
      },
      borderRadius: {
        'xl': '12px',
      },
      backdropBlur: {
        'glass': '16px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [
    // Safe area insets for mobile
    require('tailwindcss-safe-area'),
  ],
};

export default config;
```

### Utility Classes

```css
/* globals.css additions */
@layer utilities {
  /* Glass panel */
  .glass {
    @apply bg-white/[0.04] backdrop-blur-xl border border-white/[0.10] rounded-xl;
  }
  
  .glass-sm {
    @apply bg-white/[0.04] backdrop-blur-lg border border-white/[0.10] rounded-lg;
  }
  
  /* Monospace label */
  .label-mono {
    @apply font-mono text-xs uppercase tracking-wider text-slate-400;
  }
  
  /* Touch target (mobile) */
  .touch-target {
    @apply min-h-[48px] min-w-[48px];
  }
  
  .touch-target-lg {
    @apply min-h-[56px] min-w-[56px];
  }
  
  /* Accent colors (use with caution) */
  .accent-green {
    @apply text-[#00E699];
  }
  
  .accent-green-bg {
    @apply bg-[#00E699] text-[#0B0F15];
  }
  
  .accent-blue {
    @apply text-[#3D8EFF];
  }
  
  .accent-blue-bg {
    @apply bg-[#3D8EFF] text-white;
  }
}
```

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. `Shell.tsx` + providers
2. `TopBar.tsx` with `AppSwitcher`
3. `CommandPaletteTrigger.tsx`
4. Tailwind config extensions
5. Accent token system

### Phase 2: Navigation (Week 2)
1. `LeftRail.tsx` with collapse/expand
2. Navigation route definitions
3. App-specific nav sections
4. Mobile navigation (bottom sheet)

### Phase 3: Workspaces (Week 3)
1. `CenterWorkspace.tsx` + scroll handling
2. `RightContextPane.tsx`
3. SlateDrop 3-pane layout
4. Mobile stack navigation

### Phase 4: Capture Spine (Week 4)
1. Unified capture headers
2. Shutter button variants
3. Review screens
4. Deliverable flow

### Phase 5: Polish (Week 5)
1. Command palette full implementation
2. Keyboard shortcuts
3. Animation refinements
4. Accessibility audit

---

*Design locked: June 29, 2026*  
*Component structure: Next.js App Router + Tailwind CSS*  
*Design System: Graphite Glass*
