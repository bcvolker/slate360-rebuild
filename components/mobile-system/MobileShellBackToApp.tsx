"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileShellBackToAppProps = {
  className?: string;
};

export function MobileShellBackToApp({ className }: MobileShellBackToAppProps) {
  return (
    <Link
      href="/app"
      aria-label="Back to Slate360"
      className={cn(mobileTokens.moduleBackButton, mobileTokens.focusRing, className)}
    >
      <ArrowLeft className="size-[18px]" strokeWidth={2.5} aria-hidden />
    </Link>
  );
}
