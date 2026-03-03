import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import MarketClient from "@/components/dashboard/MarketClient";
import MarketProviders from "./MarketProviders";

export const metadata = {
  title: "Market Robot — Slate360",
};

export default async function MarketPage() {
  const { user, hasInternalAccess } = await resolveServerOrgContext();

  if (!user) redirect("/login");

  // Market Robot is a Slate360-internal tool — access requires isSlateCeo or slate360_staff grant.
  if (!hasInternalAccess) {
    notFound();
  }

  return (
    <MarketProviders>
      <div className="min-h-screen bg-[#ECEEF2]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <MarketClient />
        </div>
      </div>
    </MarketProviders>
  );
}
