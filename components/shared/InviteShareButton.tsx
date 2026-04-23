"use client";

import { Link2 } from "lucide-react";
import { useInviteShare } from "@/components/shared/InviteShareProvider";

export function InviteShareButton() {
  const { setOpen } = useInviteShare();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="hidden sm:flex items-center gap-2 bg-cobalt text-primary-foreground px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity text-sm font-medium border border-cobalt/30"
      aria-label="Invite and Share"
    >
      <Link2 className="h-4 w-4" />
      <span>Invite &amp; Share</span>
    </button>
  );
}
