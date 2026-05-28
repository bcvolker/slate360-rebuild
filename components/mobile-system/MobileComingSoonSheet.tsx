"use client";

import { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileComingSoonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function MobileComingSoonSheet({
  open,
  onOpenChange,
  title = "Coming Soon",
  description = "The new mobile interface for this feature is currently under construction. Please use the desktop web app in the meantime.",
}: MobileComingSoonSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-white/10 bg-[#0B0F15] p-6 pb-12 sm:max-w-none text-slate-50"
      >
        <SheetHeader className="text-left space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-400/90">
            <Hammer className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <SheetTitle className="text-xl font-semibold text-slate-50">{title}</SheetTitle>
            <SheetDescription className="text-sm text-slate-400">
              {description}
            </SheetDescription>
          </div>
        </SheetHeader>
        <div className="mt-8 flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-teal-500/90 text-white hover:bg-teal-500"
          >
            Got it
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
