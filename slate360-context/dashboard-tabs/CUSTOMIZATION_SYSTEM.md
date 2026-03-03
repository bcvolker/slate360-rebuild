# Dashboard Tabs — Customization System Contract

This contract is mandatory for all tab implementations.

## Goals
- Let users customize each tab layout (panels, toolbars, libraries, cards).
- Keep customization consistent across all modules.
- Persist per-user and per-tab preferences safely.

## Required Capabilities (All Tabs)
1. **Movable regions**
   - Drag reorder cards/widgets/tool groups.
2. **Expandable/collapsible regions**
   - Left library, right inspector, bottom timeline/log panels.
3. **Resizable regions**
   - Split-pane widths/heights with min/max bounds.
4. **Preset modes**
   - `simple`, `standard`, `advanced`, `custom`.
5. **Reset and import/export**
   - Reset to defaults; export/import JSON presets.

## Canonical Preference Shape
```ts
interface TabLayoutPrefs {
  version: 1;
  tabId: string;
  mode: "simple" | "standard" | "advanced" | "custom";
  panelOrder: string[];
  panelVisibility: Record<string, boolean>;
  panelSizes: Record<string, number>; // percentage or px by convention per tab
  pinnedTools: string[];
  expandedSections: string[];
  widgetOrder?: string[];
  widgetExpanded?: Record<string, boolean>;
}
```

## Persistence Rules
- Primary key: `layoutprefs-{tabId}-{projectId?}-{userId}`.
- Local-first persistence is acceptable for MVP.
- Add server sync later for cross-device continuity.
- Always include `version` for migration safety.

## UX Rules
- Show a `Customize` entry in each tab header/shell.
- Apply changes immediately; autosave with debounce.
- Never hide critical actions with no recovery path; keep a visible `Reset layout` action.

## Integration With Existing System
- Reuse patterns from Project Hub `ViewCustomizer` and widget preference storage.
- Keep tab-specific preferences separate from dashboard widget preferences.
- For large modules, define panel IDs and defaults in `lib/{module}/layout-presets.ts`.

## Definition of Done
- Layout changes persist across refresh.
- Panels can be moved/expanded/collapsed/resized.
- `simple/advanced` mode switching works without losing custom mode state.
- Reset path restores known-good defaults.
