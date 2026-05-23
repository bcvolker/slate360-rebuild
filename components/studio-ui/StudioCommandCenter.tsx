"use client";

import Link from "next/link";
import { ArrowRight, Box, MapPin } from "lucide-react";

type StudioCommandCenterProps = {
  workspaceName?: string | null;
};

export function StudioCommandCenter({ workspaceName }: StudioCommandCenterProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#A3AED0]">Workspace</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#FFFFFF]">
          {workspaceName ?? "Slate360"} Studio
        </h1>
        <p className="mt-3 max-w-2xl text-[#F8FAFC]">
          Precision reality capture for construction workflows. Launch Site Walk field capture or open
          Digital Twins when your organization has twin processing enabled.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/site-walk"
          className="group flex flex-col gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00E699]/10 text-[#00E699]">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#FFFFFF]">Site Walk</h2>
            <p className="mt-2 text-sm text-[#A3AED0]">
              Single-handed field tracking, predictive tag chips classification, and instant document
              deliverable field report compilation.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#00E699]">
            Open Site Walk
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/design-studio"
          className="group flex flex-col gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00E699]/10 text-[#00E699]">
            <Box className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#FFFFFF]">Digital Twins</h2>
            <p className="mt-2 text-sm text-[#A3AED0]">
              Inspect structural environments with interactive twin models, photogrammetry channels, and
              collaborator review spaces.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#00E699]">
            Open Digital Twins
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
