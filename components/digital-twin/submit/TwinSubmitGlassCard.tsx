"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { twinSubmitTokens } from "./twin-submit-tokens";

type Props = {
  title?: string;
  children: ReactNode;
  className?: string;
  dataAttr?: string;
};

export function TwinSubmitGlassCard({ title, children, className, dataAttr }: Props) {
  return (
    <section
      className={cn(twinSubmitTokens.glassCard, twinSubmitTokens.glassCardInner, className)}
      data-twin-submit={dataAttr}
    >
      {title ? <p className={cn(twinSubmitTokens.headerText, "mb-3")}>{title}</p> : null}
      {children}
    </section>
  );
}
