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

const LOGO_SRC = "/uploads/slate360-logo-reversed-v2.svg";

const SIZE_MAP = {
  sm: "h-5 w-auto",
  md: "h-7 w-auto",
  lg: "h-9 w-auto",
} as const;

interface SlateLogoProps {
  size?: keyof typeof SIZE_MAP;
  className?: string;
}

export function SlateLogo({ size = "md", className }: SlateLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="Slate360"
      className={className ?? SIZE_MAP[size]}
    />
  );
}
