"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { mobileTokens } from "@/components/mobile-system";
import { cn } from "@/lib/utils";
import type { MobileLauncherAppView } from "@/lib/mobile/mobile-launcher-app-types";

type Props = {
  app: MobileLauncherAppView | null;
  onClose: () => void;
};

export function MobileAppLauncherUpsellSheet({ app, onClose }: Props) {
  const open = Boolean(app);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className={cn(
          mobileTokens.appHomeLauncherUpsellSheet,
          "rounded-t-xl border-t border-white/10 bg-[#0B0F15] text-slate-50 sm:max-w-none",
        )}
      >
        {app ? (
          <>
            <SheetHeader className="space-y-2 text-left">
              <SheetTitle className="text-lg font-bold text-white">{app.title}</SheetTitle>
              <p className="text-sm font-medium text-zinc-400">{app.subtext}</p>
            </SheetHeader>
            <ul className="mt-5 space-y-3">
              {app.upsellBullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex gap-3 text-sm font-medium leading-6 text-zinc-300"
                >
                  <span
                    className={cn(
                      "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                      app.accent === "info"
                        ? "bg-[color-mix(in_srgb,var(--twin360-blue)_85%,white)]"
                        : "bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)]",
                    )}
                    aria-hidden
                  />
                  {bullet}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                asChild
                className={cn(
                  "min-h-14 w-full rounded-xl font-semibold",
                  app.accent === "info"
                    ? "bg-[color-mix(in_srgb,var(--twin360-blue)_22%,#0B0F15)] text-[color-mix(in_srgb,var(--twin360-blue)_92%,white)] hover:bg-[color-mix(in_srgb,var(--twin360-blue)_30%,#0B0F15)]"
                    : "bg-[color-mix(in_srgb,var(--graphite-primary)_22%,#0B0F15)] text-[color-mix(in_srgb,var(--graphite-primary)_92%,white)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_30%,#0B0F15)]",
                )}
              >
                <Link href="/more/billing" onClick={onClose}>
                  Upgrade plan
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-14 w-full rounded-xl font-semibold text-zinc-400 hover:text-white"
                onClick={onClose}
              >
                Not now
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
