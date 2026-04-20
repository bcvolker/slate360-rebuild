"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { HelpFeedbackModal } from "./HelpFeedbackModal";

export function HelpFeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-cobalt text-cobalt hover:bg-cobalt/10 px-3 py-1.5 rounded-full transition-colors text-xs sm:text-sm font-medium"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Help &amp; Feedback</span>
      </button>
      <HelpFeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
}
