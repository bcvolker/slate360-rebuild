/**
 * SlateLogo — single source of truth for the Slate360 brand logo.
 *
 * Usage:
 *   import { SlateLogo } from "@/components/shared/SlateLogo";
 *   <SlateLogo />              // default h-7
 *   <SlateLogo size="sm" />    // h-5
 *   <SlateLogo size="lg" />    // h-9
 *
 * To change the logo sitewide, update the `src` constant below.
 */

import type { ImgHTMLAttributes } from "react";

const LOGO_SRC = "/uploads/slate360-logo-cobalt-v3.svg?v=cobalt-2026-04-19c";

const SIZE_MAP = {
  sm: "h-5 w-auto",
  md: "h-7 w-auto",
  lg: "h-9 w-auto",
} as const;

interface SlateLogoProps {
  size?: keyof typeof SIZE_MAP;
  className?: string;
}

type SlateLogoImageProps = SlateLogoProps & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

export function SlateLogo({ size = "md", className, ...imgProps }: SlateLogoImageProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="Slate360"
      className={className ?? SIZE_MAP[size]}
      {...imgProps}
    />
  );
}
