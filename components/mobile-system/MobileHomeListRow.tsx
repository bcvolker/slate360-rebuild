"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileHomeListRowProps = {
  title: string;
  meta?: string;
  metaTone?: "neutral" | "primary" | "info";
  href?: string;
  onClick?: () => void;
  className?: string;
};

const META_CLASS = {
  neutral: mobileTokens.mobileHomeRowMeta,
  primary: mobileTokens.mobileHomeRowMetaPrimary,
  info: mobileTokens.mobileHomeRowMetaInfo,
} as const;

export function MobileHomeListRow({
  title,
  meta,
  metaTone = "neutral",
  href,
  onClick,
  className,
}: MobileHomeListRowProps) {
  const body = (
    <>
      <span className={mobileTokens.mobileHomeRowTitle}>{title}</span>
      {meta ? <span className={META_CLASS[metaTone]}>{meta}</span> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(mobileTokens.mobileHomeRowLink, className)}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(mobileTokens.mobileHomeRowLink, "w-full text-left", className)}
    >
      {body}
    </button>
  );
}
