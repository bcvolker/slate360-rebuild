/**
 * SlateLogoOnLight — Slate360 brand logo for LIGHT backgrounds only.
 *
 * Uses the cobalt/dark-text variant of the lockup so the logo stays
 * legible against white surfaces (mobile nav sheet, light cards, print
 * exports, etc).
 *
 * For DARK backgrounds (sidebar, header, marketing hero), use the
 * default `<SlateLogo />` from `./SlateLogo` instead. Mixing the two
 * is intentional — there is no `variant` prop on either component, by
 * design (variants reintroduce the "the logo disappeared" bug class).
 */

import type { ImgHTMLAttributes } from "react";

const LOGO_SRC = "/uploads/slate360-logo-cobalt-v3.svg?v=cobalt-2026-04-23";

const SIZE_MAP = {
  sm: "h-5 w-auto",
  md: "h-7 w-auto",
  lg: "h-9 w-auto",
} as const;

interface SlateLogoOnLightProps {
  size?: keyof typeof SIZE_MAP;
  className?: string;
}

type SlateLogoOnLightImageProps = SlateLogoOnLightProps &
  Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

export function SlateLogoOnLight({ size = "md", className, ...imgProps }: SlateLogoOnLightImageProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="Slate360"
      className={className ?? SIZE_MAP[size]}
      {...imgProps}
    />
  );
}
