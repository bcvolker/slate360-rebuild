"use client";

import Web3Providers from "@/components/Web3Providers";

type MarketProvidersProps = {
  children: React.ReactNode;
};

export default function MarketProviders({ children }: MarketProvidersProps) {
  return <Web3Providers>{children}</Web3Providers>;
}
