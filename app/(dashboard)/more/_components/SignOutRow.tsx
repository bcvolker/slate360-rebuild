"use client";

import { LogOut } from "lucide-react";
import { ChevronRight } from "lucide-react";

export function SignOutRow() {
  return (
    <form action="/api/auth/signout" method="post">
      <button
        type="submit"
        className="flex w-full min-h-16 items-center gap-3 border-b border-white/10 px-4 transition hover:bg-rose-500/10 last:border-b-0"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300">
          <LogOut className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-rose-200 text-left">Sign Out</span>
        <ChevronRight className="h-4 w-4 text-slate-500" />
      </button>
    </form>
  );
}
