"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

interface TrialBannerProps {
  feature: string;
  accent?: string;
}

export default function TrialBanner({ feature, accent = "#FF4D00" }: TrialBannerProps) {
  return (
    <div
      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        borderColor: `${accent}30`,
        backgroundColor: `${accent}08`,
      }}
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}15`, color: accent }}
      >
        <Sparkles size={16} />
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed">
        You&apos;re on the <span className="font-semibold text-white">Trial</span> plan.{" "}
        {feature} is available with limited data, watermarked exports, and restricted deliverables.{" "}
        <Link
          href="/plans"
          className="font-semibold underline underline-offset-2 transition-colors hover:opacity-80"
          style={{ color: accent }}
        >
          Upgrade
        </Link>{" "}
        for full access.
      </p>
    </div>
  );
}
