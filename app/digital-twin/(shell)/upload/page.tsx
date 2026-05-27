"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { mobileTokens } from "@/components/mobile-system";
import { cn } from "@/lib/utils";

export default function DigitalTwinUploadPage() {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#6EA7A0]/20 bg-[#6EA7A0]/10 text-[#6EA7A0]">
            <Upload className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-100">Upload from Phone</h2>
            <p className="text-xs text-zinc-400">360 video or drone footage on device</p>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed text-zinc-400">
          Large uploads are best on desktop with a stable connection. Use this path for
          shorter clips already on your phone.
        </p>
        <label
          className={cn(
            "inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold",
            mobileTokens.mobilePrimaryButton,
            mobileTokens.focusRing,
          )}
        >
          Choose file
          <input
            type="file"
            accept="video/*,image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setSelectedName(file?.name ?? null);
            }}
          />
        </label>
        {selectedName ? (
          <p className="text-xs text-zinc-400">
            Selected: <span className="text-zinc-200">{selectedName}</span>. Choose a project
            workspace, then finish the upload from My Twins.
          </p>
        ) : null}
        <Link
          href="/digital-twin/twins"
          className="text-center text-xs font-medium text-[#6EA7A0] hover:text-[#6EA7A0]/80 hover:underline"
        >
          Go to My Twins
        </Link>
      </div>
    </div>
  );
}
