/**
 * SlateLogo — compatibility wrapper around the canonical brand mark.
 *
 * The single source of truth for the Slate360 logo is `Slate360Logo`
 * (components/studio-ui/LogoProvider.tsx) — the same icon + gradient "360"
 * wordmark the marketing homepage renders. This wrapper keeps the historical
 * `SlateLogo` API (size sm/md/lg + className/aria-*) so every existing consumer
 * (mobile app shells, dashboard sidebar, public pages, etc.) renders the
 * canonical logo without a per-file migration.
 *
 * For light backgrounds use `<SlateLogoOnLight />`.
 */

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";

const SIZE_MAP = {
  sm: "header",
  md: "header",
  lg: "default",
} as const;

interface SlateLogoProps extends HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof SIZE_MAP;
}

export function SlateLogo({ size = "md", className, ...rest }: SlateLogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)} {...rest}>
      <Slate360Logo variant="dark" size={SIZE_MAP[size]} />
    </span>
  );
}
