"use client";

import React, { type ComponentProps } from "react";
import MarketDirectBuyTab from "@/components/dashboard/market/MarketDirectBuyTab";

interface MarketMarketsSectionProps extends ComponentProps<typeof MarketDirectBuyTab> {
  onNavigate: (tabId: string) => void;
}

export default function MarketMarketsSection({ onNavigate, ...directBuyProps }: MarketMarketsSectionProps) {
  return (
    <MarketDirectBuyTab {...directBuyProps} onNavigate={onNavigate} />
  );
}