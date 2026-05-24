"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";

export function MobileAppRootContent() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
      <section className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A3AED0]">Your Apps</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-[#FFFFFF]">Field Hub</h1>
        </div>

        <Link
          href="/site-walk"
          className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-slate-900/40 p-5 transition-all hover:border-[#00E699]/30 active:scale-[0.99]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#00E699]/20 bg-[#00E699]/10">
            <MapPin className="h-6 w-6 text-[#00E699]" />
          </span>
          <div>
            <p className="text-base font-semibold text-[#FFFFFF]">Site Walk Field Hub</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#A3AED0]">
              Capture geolocated field conditions, plan pins, and deliverable reports from your device.
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}
