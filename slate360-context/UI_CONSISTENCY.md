# Slate360 UI Consistency System

**Last Updated:** 2026-03-05  
**Status:** Active — apply to all new UI and refactor existing components to align

---

## The Problem

Slate360 has grown module-by-module, resulting in:
- Multiple modal patterns (some use `ModalBackdrop`, some build their own overlay)
- Inconsistent form field styling (mixed border-radius, font sizes, focus colors)
- Buttons that look different in different modules
- Drawer/panel slide-outs that each manage their own z-index and animation
- Toolbar containers with different heights, backgrounds, border styles

This document establishes **one canonical pattern for each UI building block**. Every new component and every refactor MUST follow these patterns.

---

## Core Design Tokens

These are the **single source of truth** for all visual values. All new code must use these — never hardcode values.

```css
/* Brand */
--brand:       #FF4D00;
--brand-light: rgba(255, 77, 0, 0.08);
--brand-ring:  rgba(255, 77, 0, 0.2);

/* Neutral surface */
--surface:     #FFFFFF;
--surface-2:   #F9FAFB;   /* gray-50 */
--surface-3:   #F3F4F6;   /* gray-100 */

/* Border */
--border:      #E5E7EB;   /* gray-200 */
--border-soft: #F3F4F6;   /* gray-100 */

/* Text */
--text-primary:   #111827; /* gray-900 */
--text-secondary: #6B7280; /* gray-500 */
--text-muted:     #9CA3AF; /* gray-400 */
--text-xs-label:  #6B7280; /* 10px uppercase tracking labels */

/* Status */
--success: #10B981;
--warning: #F59E0B;
--danger:  #EF4444;
--info:    #3B82F6;

/* Elevation */
--shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
--shadow-md:  0 4px 24px rgba(0,0,0,0.08);
--shadow-lg:  0 8px 40px rgba(0,0,0,0.12);
--shadow-xl:  0 20px 60px rgba(0,0,0,0.15);
```

Until CSS tokens are wired up globally, use the Tailwind equivalents consistently:  
`gray-50/100/200/400/500/900`, `[#FF4D00]`, `[#FF4D00]/5`, `[#FF4D00]/20`, etc.

---

## 1. Modals

### Anatomy
```
<ModalBackdrop>           ← fixed inset-0 bg-black/40 backdrop-blur-sm z-50
  <div modal-shell>       ← bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-{size}
    <div modal-header>    ← flex justify-between px-6 py-4 border-b border-gray-100
      <div>
        <h3 modal-title>  ← text-base font-bold text-gray-900
        <p modal-sub>     ← text-xs text-gray-400 mt-0.5 (optional)
      </div>
      <button close-btn>  ← w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100
    </div>
    <div modal-body>      ← p-6 space-y-4
    </div>
    <div modal-footer>    ← px-6 py-4 border-t border-gray-100 flex justify-end gap-2 (optional)
    </div>
  </div>
</ModalBackdrop>
```

### Sizes
| Name | Class | Use case |
|---|---|---|
| `sm` | `max-w-sm` | Confirmation dialogs, quick actions |
| `md` | `max-w-md` | Standard forms (default) |
| `lg` | `max-w-lg` | Complex forms, detail views |
| `xl` | `max-w-2xl` | Multi-column or media-heavy modals |

### Rules
- Always use `ModalBackdrop` from `SlateDropClient` or extract it to `components/ui/ModalBackdrop.tsx`
- Never build a custom backdrop — always `bg-black/40 backdrop-blur-sm`
- Close button always top-right, always `<X size={16} />`
- Fade + scale in: `animate-fadeInScale` (or Tailwind's `animate-in zoom-in-95`)
- Never allow body scroll when modal is open (currently not implemented — use `useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, [])`)

---

## 2. Drawers / Slide-out Panels

### Anatomy
```
<div drawer-overlay>      ← fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]
<div drawer-panel>        ← fixed top-0 right-0 h-full w-[420px] bg-white shadow-xl z-50
                             border-l border-gray-100 flex flex-col
                             transition: translate-x-0 (open) / translate-x-full (closed)
  <div drawer-header>     ← flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0
    <div>
      <h3 drawer-title>   ← text-base font-bold text-gray-900
      <p drawer-sub>      ← text-xs text-gray-400 mt-0.5 (optional)
    </div>
    <button close-btn>    ← w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100
  </div>
  <div drawer-body>       ← flex-1 overflow-y-auto p-6
  </div>
  <div drawer-footer>     ← shrink-0 px-6 py-4 border-t border-gray-100 (if needed)
  </div>
</div>
```

### Widths
| Name | Class | Use case |
|---|---|---|
| `narrow` | `w-80` | Quick detail panels |
| `default` | `w-[420px]` | Standard detail views (ContactDetailPanel, etc.) |
| `wide` | `w-[600px]` | Edit forms, multi-tab panels |
| `full` | `w-full max-w-2xl` | Full-screen-ish (mobile-first) |

### Rules
- Always slide in from the right (left drawers require explicit approval)
- Always has an overlay that closes the drawer on click
- Transition: `transition-transform duration-300 ease-in-out`
- Body scrolls independently of page

---

## 3. Form Fields

Every input, select, and textarea uses the **same exact class string**:

```tsx
// Input
className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm 
           focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] 
           transition-all disabled:opacity-50 disabled:cursor-not-allowed"

// Textarea (add resize-none)
className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm 
           focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] 
           transition-all resize-none"

// Select (add bg-white)
className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm 
           focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] 
           transition-all bg-white"
```

### Label pattern
```tsx
<label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
  Field Name
</label>
```

### Error pattern
```tsx
{error && (
  <p className="text-[11px] text-red-500 mt-1">{error}</p>
)}
```

### Compact inputs (inside widget cards, tight UIs)
Use `py-2` instead of `py-2.5` and `text-xs` instead of `text-sm`.

---

## 4. Buttons

### Primary (CTA / save / confirm)
```tsx
<button className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#FF4D00] 
                   hover:bg-[#e64500] active:bg-[#cc3d00] 
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
  Save
</button>
```

### Secondary / Ghost
```tsx
<button className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 
                   border border-gray-200 hover:bg-gray-50 transition-colors">
  Cancel
</button>
```

### Danger
```tsx
<button className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white 
                   bg-red-500 hover:bg-red-600 disabled:opacity-40 transition-colors">
  Delete
</button>
```

### Icon button (toolbar / card action)
```tsx
<button className="w-8 h-8 rounded-lg flex items-center justify-center 
                   text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
  <Icon size={16} />
</button>
```

### Link-style action (widget header actions, small CTAs)
```tsx
<button className="text-[11px] font-semibold text-[#FF4D00] hover:underline 
                   flex items-center gap-0.5">
  <Plus size={12} /> Add
</button>
```

### Loading state pattern
```tsx
disabled={loading}
className="... disabled:opacity-40"
>
  {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Save"}
</button>
```

---

## 5. Widget Cards

All dashboard widgets use `<WidgetCard>` from `components/widgets/WidgetCard.tsx`.

```tsx
<WidgetCard
  key={id}
  icon={IconComponent}
  title="Widget Title"
  span={span}
  delay={0|150|200|300|350}   // stagger: 0=first, 350=last
  color={widgetColor}          // from user prefs
  onSetSize={handleSetSize}
  size={widgetSize}
  action={<button>...</button>} // optional top-right action
>
  {/* widget body */}
</WidgetCard>
```

**Rules:**
- Never build custom widget card HTML — always use `WidgetCard`
- `key` must always be the widget `id` (not arbitrary string)
- `delay` staggers entrance animation; use 0/150/200/300/350 in order of visual position
- `action` slot: ONLY link-style actions (see §4 link-style action above)

---

## 6. Toolbars

All module-level toolbars (SlateDrop top bar, Project Hub header, etc.) follow this anatomy:

```tsx
<div className="flex items-center gap-2 px-4 h-12 border-b border-gray-100 bg-white shrink-0">
  {/* Left: breadcrumbs or title */}
  <div className="flex items-center gap-2 flex-1 min-w-0">
    ...
  </div>
  {/* Right: actions */}
  <div className="flex items-center gap-2 shrink-0">
    ...
  </div>
</div>
```

**Height:** always `h-12` (48px). Never use `h-10` or `h-14` for primary toolbars.  
**Background:** `bg-white` with `border-b border-gray-100`.  
**Action buttons:** icon buttons (`w-8 h-8`) or compact text buttons (`px-3 py-1.5 text-xs`).

---

## 7. Empty States

All empty states follow this pattern:

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon size={32} className="text-gray-200 mb-3" />
  <p className="text-sm font-semibold text-gray-900 mb-1">Nothing here yet</p>
  <p className="text-xs text-gray-400 mb-4">Descriptive explanation of what this area shows</p>
  <button className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#FF4D00]">
    Primary Action
  </button>
</div>
```

**Rules:**
- Large ghosted icon (size 28–40, `text-gray-200`)
- Short bold headline
- One-line explanation in gray-400
- One CTA button (optional if empty state is informational only)

---

## 8. Loading States

### Spinner (inline or overlay)
```tsx
<Loader2 size={16} className="animate-spin text-gray-400" />
```

### Skeleton rows (list items loading)
```tsx
<div className="space-y-3 animate-pulse">
  {[...Array(3)].map((_, i) => (
    <div key={i} className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-2 bg-gray-100 rounded w-1/3" />
      </div>
    </div>
  ))}
</div>
```

### Full-widget loading
Wrap the widget body in:
```tsx
{loading ? (
  <div className="flex justify-center py-8">
    <Loader2 size={20} className="animate-spin text-gray-300" />
  </div>
) : (
  /* content */
)}
```

---

## 9. Toast / Notifications

Use the `showToast(message: string, success: boolean)` pattern already established in `SlateDropClient`.

**Rules:**
- Success: green border + checkmark
- Error: red border + X
- Auto-dismiss: 2–3 seconds
- Position: fixed bottom-right, z-50
- Never stack more than 1 toast visible at a time

---

## 10. Tabs (within modals, drawers, pages)

```tsx
<div className="flex border-b border-gray-100 mb-6">
  {["Tab A", "Tab B"].map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
        activeTab === tab
          ? "border-[#FF4D00] text-[#FF4D00]"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {tab}
    </button>
  ))}
</div>
```

---

## 11. Badges / Status Chips

### Status badge
```tsx
<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
  status === "active"     ? "bg-emerald-50 text-emerald-700" :
  status === "on-hold"    ? "bg-amber-50 text-amber-700" :
  status === "completed"  ? "bg-gray-100 text-gray-600" : ""
}`}>
  {status}
</span>
```

### Tag / label chip
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-[10px] text-gray-600 font-medium">
  {tag}
</span>
```

---

## 12. Avatar / Initials

```tsx
<div
  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
  style={{ backgroundColor: color }}
>
  {initials}
</div>
```

| Size class | Usage |
|---|---|
| `w-6 h-6 text-[9px]` | Dense lists, inline mentions |
| `w-8 h-8 text-[10px]` | Standard list rows (default) |
| `w-10 h-10 text-xs` | Card headers, contact detail |
| `w-12 h-12 text-sm` | Profile sections |

---

## Shared Primitive Components (Build Priority)

These should be extracted as shared primitives. Create them in `components/ui/`:

| Component | Priority | What it wraps |
|---|---|---|
| `ModalBackdrop.tsx` | **P0** | Fixed overlay + scroll lock + escape handler |
| `Drawer.tsx` | **P0** | Right-side slide-out with overlay |
| `FormField.tsx` | **P1** | label + input/select/textarea + error |
| `Button.tsx` | **P1** | Primary/secondary/danger/icon variants |
| `EmptyState.tsx` | **P1** | Icon + headline + sub + optional CTA |
| `SkeletonRow.tsx` | **P2** | Animated skeleton for list rows |
| `Avatar.tsx` | **P2** | Initials circle with size/color props |
| `Tabs.tsx` | **P2** | Tab bar with active state |
| `Badge.tsx` | **P2** | Status/label chip |

---

## Implementation Checklist (for each new component)

- [ ] Modal uses `ModalBackdrop` wrapper
- [ ] Drawer slides from right, uses standard width
- [ ] Form inputs use exact standard class string
- [ ] Labels use `text-[10px] font-semibold text-gray-500 uppercase tracking-wider`
- [ ] Primary button: orange fill, `rounded-xl`
- [ ] Secondary button: white + `border border-gray-200`
- [ ] Empty state: ghosted icon + headline + sub
- [ ] Loading state: `Loader2 animate-spin` or skeleton
- [ ] Toolbar: `h-12 border-b border-gray-100 bg-white`
- [ ] No hardcoded colors (use `text-gray-*` / `[#FF4D00]` tokens)
- [ ] No `any` types
- [ ] Component under 300 lines
