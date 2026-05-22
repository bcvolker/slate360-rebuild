"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface MobileCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileCreateSheet({ open, onOpenChange }: MobileCreateSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-white/10 bg-[#0B0F15] p-6 pb-12 sm:max-w-none text-slate-50"
      >
        <SheetHeader className="text-left space-y-4">
          <SheetTitle className="text-xl font-semibold text-slate-50">Create New...</SheetTitle>
        </SheetHeader>
        <div className="mt-8 flex flex-col gap-4">
          <Button
            asChild
            variant="outline"
            className="w-full bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <Link href="/projects?new=1" onClick={() => onOpenChange(false)}>
              Create Project
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            <Link href="/site-walk/setup" onClick={() => onOpenChange(false)}>
              Start Site Walk
            </Link>
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
