"use client";

import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import type { MarketSortDirection } from "@/components/dashboard/market/types";

export default function MarketSortHeader({
  label,
  help,
  active,
  direction,
  onClick,
  align = "right",
}: {
  label: string;
  help?: string;
  active: boolean;
  direction?: MarketSortDirection;
  onClick?: () => void;
  align?: "left" | "right" | "center";
}) {
  const alignClass = align === "left" ? "justify-start text-left" : align === "center" ? "justify-center text-center" : "justify-end text-right";
  const arrow = !active ? "↕" : direction === "asc" ? "▲" : "▼";

  if (!onClick) {
    return (
      <span className={`inline-flex w-full items-center gap-1 ${alignClass}`}>
        <span>{label}</span>
        {help ? <HelpTip content={help} /> : null}
      </span>
    );
  }

  return (
    <button onClick={onClick} className={`inline-flex w-full items-center gap-1 ${alignClass} font-medium ${active ? "text-[#D4AF37]" : "text-gray-400 hover:text-gray-600"}`}>
      <span>{label}</span>
      <span className={`text-[10px] ${active ? "text-[#D4AF37]" : "text-gray-300"}`}>{arrow}</span>
      {help ? <HelpTip content={help} /> : null}
    </button>
  );
}