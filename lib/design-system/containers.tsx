/**
 * ═══════════════════════════════════════════════════════════════
 * Slate360 Design System — Container & Control Primitives
 *
 * Reusable layout containers and subtle controls for
 * dashboard sections, list previews, and toggle patterns.
 * ═══════════════════════════════════════════════════════════════
 */
import React from "react";
import { cn } from "@/lib/utils";

/* ── Contained Section ──────────────────────────────────────── */

interface SlateContainedSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Max height before internal scroll kicks in (CSS value) */
  maxHeight?: string;
  /** Show a soft top/bottom edge fade to imply scrollability */
  fadeMask?: boolean;
}

/**
 * SlateContainedSection — scrollable container with hidden scrollbar
 * and optional edge-fade cue.
 *
 * Used for notifications preview, project lists, pinned items, etc.
 * Prevents page-height blowout by constraining content vertically.
 */
export function SlateContainedSection({
  maxHeight = "280px",
  fadeMask = true,
  className,
  children,
  ...props
}: SlateContainedSectionProps) {
  return (
    <div
      className={cn("relative", className)}
      {...props}
    >
      <div
        className="overflow-y-auto scrollbar-none"
        style={{ maxHeight }}
      >
        {children}
      </div>
      {fadeMask && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent"
          aria-hidden
        />
      )}
    </div>
  );
}

/* ── Subtle Toggle ──────────────────────────────────────────── */

interface SlateSubtleToggleProps {
  options: string[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * SlateSubtleToggle — understated toggle for list sections.
 *
 * Encodes: pill-shaped, muted inactive, primary-tinted active.
 * Designed to sit in a section header without dominating.
 */
export function SlateSubtleToggle({
  options,
  active,
  onChange,
  className,
}: SlateSubtleToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5",
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-3 py-1 rounded-md text-xs font-semibold transition-all",
            active === opt
              ? "bg-primary/15 text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
