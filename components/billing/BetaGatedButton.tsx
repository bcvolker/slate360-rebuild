"use client";

import { ReactNode } from "react";
import { isBetaMode, BETA_DISABLED_LABELS } from "@/lib/beta-mode";

interface BetaGatedButtonProps {
  action: 'subscribe' | 'upgrade' | 'buyCredits' | 'addCollaborator';
  children: ReactNode;
  className?: string;
  renderEnabled: () => ReactNode;
}

export function BetaGatedButton({ action, children, className, renderEnabled }: BetaGatedButtonProps) {
  if (!isBetaMode()) {
    return renderEnabled();
  }

  const label = BETA_DISABLED_LABELS[action];

  return (
    <div className="relative inline-block group">
      <button
        disabled
        className={`cursor-not-allowed opacity-60 ${className || ''}`}
        aria-disabled="true"
      >
        {children}
      </button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex items-center space-x-2 bg-gray-900 text-white text-xs py-1.5 px-3 rounded whitespace-nowrap z-50">
        <span className="bg-[#3B82F6] text-white px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
          Beta
        </span>
        <span>{label}</span>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
