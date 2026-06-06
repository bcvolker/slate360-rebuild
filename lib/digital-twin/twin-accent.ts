/**
 * Digital Twin accent classes — CSS vars from globals.css / lib/design-system/tokens.ts (modules.twin360).
 * Do not hardcode #3D8EFF in Twin components; use these tokens.
 */
export const twinAccent = {
  text: "text-[var(--twin360-blue)]",
  textMuted: "text-[color-mix(in_srgb,var(--twin360-blue)_75%,white)]",
  textHover: "hover:text-[color-mix(in_srgb,var(--twin360-blue)_85%,white)]",
  link: "font-medium text-[var(--twin360-blue)] hover:text-[color-mix(in_srgb,var(--twin360-blue)_80%,white)] hover:underline",
  iconChip:
    "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] text-[var(--twin360-blue)]",
  cardHover: "hover:border-[var(--accent-border-blue)] hover:bg-white/[0.06]",
  spinner: "text-[var(--twin360-blue)]",
  button:
    "rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--twin360-blue)] transition-colors hover:bg-[color-mix(in_srgb,var(--twin360-blue)_18%,transparent)] disabled:opacity-50",
  buttonDanger:
    "rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/15 disabled:opacity-50",
} as const;
