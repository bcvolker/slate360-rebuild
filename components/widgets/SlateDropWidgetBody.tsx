"use client";

import SlateDropClient from "@/components/slatedrop/SlateDropClient";
import type { Tier } from "@/lib/entitlements";

export default function SlateDropWidgetBody({
  user,
  tier,
  initialProjectId,
}: {
  user: { name: string; email: string };
  tier: Tier;
  initialProjectId?: string;
}) {
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-hidden">
        <SlateDropClient user={user} tier={tier} initialProjectId={initialProjectId} embedded />
      </div>
    </div>
  );
}
