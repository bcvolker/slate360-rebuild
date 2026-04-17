/**
 * ═══════════════════════════════════════════════════════════════
 * Slate360 Design System — Primitive Components
 *
 * Reusable UI building blocks that encode the visual language
 * from the mobile shell Quick Actions design source of truth:
 *
 * - Card family: rounded-2xl, glass border, shadow
 * - Icon container: rounded-xl, tinted background
 * - Active state: scale(0.99) press
 * - Hover state: shadow lift
 * - Accent: gold CTA with glow
 *
 * These are the ONLY card/section primitives that should be used
 * when rolling out the design system to new surfaces.
 * ═══════════════════════════════════════════════════════════════
 */
import React from "react";
import { cn } from "@/lib/utils";

/* ── Slate Card ─────────────────────────────────────────────── */

interface SlateCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Elevation level */
  elevation?: "flat" | "raised" | "hero";
  /** Optional hover lift effect */
  hoverable?: boolean;
  /** Optional press/active scale effect */
  pressable?: boolean;
}

/**
 * SlateCard — the canonical card component for the design system.
 *
 * Encodes: rounded-2xl, glass border, surface background, shadow level.
 * Matches the mobile shell quick-actions dropdown card style.
 */
export function SlateCard({
  elevation = "raised",
  hoverable = false,
  pressable = false,
  className,
  children,
  ...props
}: SlateCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card text-card-foreground",
        elevation === "flat" && "border-border shadow-none",
        elevation === "raised" && "border-glass shadow-sm",
        elevation === "hero" && "border-glass shadow-glass",
        hoverable && "transition-shadow hover:shadow-glass",
        pressable && "transition-transform active:scale-[0.99]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ── Slate Card Header ──────────────────────────────────────── */

interface SlateCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional action slot (button, icon, etc.) */
  action?: React.ReactNode;
}

export function SlateCardHeader({
  action,
  className,
  children,
  ...props
}: SlateCardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0">{children}</div>
      {action}
    </div>
  );
}

/* ── Slate Card Body ────────────────────────────────────────── */

export function SlateCardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-4 pb-4", className)} {...props}>
      {children}
    </div>
  );
}

/* ── Module Icon ────────────────────────────────────────────── */

interface SlateModuleIconProps {
  /** Module accent color (hex) */
  color: string;
  /** Size in pixels */
  size?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * SlateModuleIcon — the tinted icon container from mobile quick-actions.
 *
 * Encodes: rounded-xl, tinted bg at 8% opacity, icon in module color.
 */
export function SlateModuleIcon({
  color,
  size = 36,
  className,
  children,
}: SlateModuleIconProps) {
  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center shrink-0",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}14`,
        color,
      }}
    >
      {children}
    </div>
  );
}

/* ── Slate CTA Button ───────────────────────────────────────── */

interface SlateCTAProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: "gold" | "outline" | "ghost";
  /** Full width */
  fullWidth?: boolean;
}

/**
 * SlateCTA — gold accent CTA button with glow.
 *
 * Encodes: rounded-full, gold bg, dark text, gold-glow shadow, press scale.
 */
export function SlateCTA({
  variant = "gold",
  fullWidth = false,
  className,
  children,
  ...props
}: SlateCTAProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold text-sm rounded-full transition-all disabled:opacity-50",
        fullWidth && "w-full",
        variant === "gold" &&
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold-glow py-3 px-6 active:scale-[0.98]",
        variant === "outline" &&
          "border border-border text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 py-2.5 px-5",
        variant === "ghost" &&
          "text-muted-foreground hover:text-foreground hover:bg-accent py-2.5 px-5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ── Slate Section Header ───────────────────────────────────── */

interface SlateSectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
}

/**
 * SlateSectionHeader — page/section title block.
 *
 * Encodes: font-black heading, muted subtitle, optional action slot.
 */
export function SlateSectionHeader({
  title,
  subtitle,
  className,
  action,
}: SlateSectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ── Slate Nav Item ─────────────────────────────────────────── */

interface SlateNavItemProps {
  /** Module accent color */
  color: string;
  /** Display label */
  label: string;
  /** Optional description */
  desc?: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Whether this item is currently active */
  active?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * SlateNavItem — navigation row from mobile quick-actions dropdown.
 *
 * Encodes: tinted icon, bold label, muted description, hover bg.
 */
export function SlateNavItem({
  color,
  label,
  desc,
  icon,
  active,
  className,
  onClick,
}: SlateNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3.5 px-4 py-3.5 w-full text-left transition-colors",
        "hover:bg-accent active:bg-accent/80",
        "border-b border-border last:border-0",
        active && "bg-accent",
        className,
      )}
    >
      <SlateModuleIcon color={color} size={36}>
        {icon}
      </SlateModuleIcon>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground leading-tight">
          {label}
        </p>
        {desc && (
          <p className="text-xs text-muted-foreground leading-snug truncate">
            {desc}
          </p>
        )}
      </div>
    </button>
  );
}
