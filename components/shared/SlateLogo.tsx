/**
 * SlateLogo — single source of truth for the Slate360 brand logo.
 *
 * The entire Slate360 app is dark-themed. There is exactly ONE logo we
 * ever render: white SLATE text + cobalt 360. Do NOT reintroduce a
 * "dark"/graphite variant — on dark surfaces it's invisible, and that
 * has caused hours of "the logo disappeared" bugs.
 *
 * If a marketing surface ever needs a logo on a light background,
 * create a separate `SlateLogoOnLight` component; do not add a variant
 * prop here. Variants are how this bug keeps coming back.
 */

import type { ImgHTMLAttributes } from "react";

const LOGO_SRC = "/uploads/slate360-logo-light-v3.svg?v=cobalt-2026-04-20";

const SIZE_MAP = {
  sm: "h-5 w-auto",
  md: "h-7 w-auto",
  lg: "h-9 w-auto",
} as const;

interface SlateLogoProps {
  size?: keyof typeof SIZE_MAP;
  className?: string;
}

type SlateLogoImageProps = SlateLogoProps &
  Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

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
