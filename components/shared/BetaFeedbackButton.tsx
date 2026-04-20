"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { BetaFeedbackModal } from "./BetaFeedbackModal";

interface BetaFeedbackButtonProps {
  isEligible: boolean;
}

export function BetaFeedbackButton({ isEligible }: BetaFeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  if (!isEligible) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-1.5 border border-cobalt/40 text-cobalt bg-cobalt/10 px-2.5 py-1.5 rounded-full hover:bg-cobalt/20 transition-colors text-xs font-medium"
      >
        <Bug className="h-3.5 w-3.5" />
        <span>Beta Feedback</span>
      </button>
      <BetaFeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
}
