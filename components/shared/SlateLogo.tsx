/**
 * SlateLogo — single source of truth for the Slate360 brand logo.
 *
 * Variants:
 *   - "light" (default): white SLATE text + cobalt 360. Use on DARK surfaces.
 *   - "dark": graphite SLATE text + cobalt 360. Use on LIGHT surfaces.
 * Both have transparent backgrounds.
 */

import type { ImgHTMLAttributes } from "react";

const LOGO_SOURCES = {
  light: "/uploads/slate360-logo-light-v3.svg?v=cobalt-2026-04-19d",
  dark: "/uploads/slate360-logo-cobalt-v3.svg?v=cobalt-2026-04-19d",
} as const;

const SIZE_MAP = {
  sm: "h-5 w-auto",
  md: "h-7 w-auto",
  lg: "h-9 w-auto",
} as const;

interface SlateLogoProps {
  size?: keyof typeof SIZE_MAP;
  variant?: keyof typeof LOGO_SOURCES;
  className?: string;
}

type SlateLogoImageProps = SlateLogoProps & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

export function SlateLogo({ size = "md", variant = "light", className, ...imgProps }: SlateLogoImageProps) {
  return (
    <img
      src={LOGO_SOURCES[variant]}
      alt="Slate360"
      className={className ?? SIZE_MAP[size]}
      {...imgProps}
    />
  );
}
