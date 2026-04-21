/**
 * Public preview of Site Walk shell with new 5-tab module nav.
 * No auth required. Open on phone to preview new Site Walk chrome.
 *
 * Route: /preview/site-walk-v1
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Footprints,
  FileText,
  Send,
  MoreHorizontal,
  Camera,
  Upload,
  Mic,
  Type,
  ArrowRight,
  Image as ImageIcon,
  Video,
  Square,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SITE_WALK_NAV = [
  { label: "Home", href: "/preview/site-walk-v1", icon: Home },
  { label: "Walks", href: "#walks", icon: Footprints },
  { label: "Deliverables", href: "#deliverables", icon: FileText },
  { label: "Share", href: "#share", icon: Send },
  { label: "More", href: "#more", icon: MoreHorizontal },
];

const QUICK_START = [
  { label: "Camera", icon: Camera, desc: "Take photo, mark up" },
  { label: "Upload Photo", icon: ImageIcon, desc: "From phone library" },
  { label: "Upload File", icon: Upload, desc: "PDF, doc, plan" },
  { label: "Voice Note", icon: Mic, desc: "Hands-free capture" },
];

const RECENT_WALKS = [
  { name: "Atlas Tower — Floor 12", items: 18, when: "2h ago", project: "Atlas Tower" },
  { name: "Standalone inspection", items: 6, when: "Yesterday", project: null },
  { name: "Riverside punch round", items: 23, when: "Mar 19", project: "Riverside" },
];

const RECENT_DELIVERABLES = [
  { name: "Floor 12 Progress Report", type: "Progress Report", when: "1h ago" },
  { name: "Electrical Inspection — Bldg A", type: "Inspection", when: "Yesterday" },
  { name: "Punch List Roll-up", type: "Punch List", when: "2d ago" },
];

export default function SiteWalkPreviewPage() {
  const pathname = usePathname() ?? "/preview/site-walk-v1";

  return (
    <div className="min-h-screen bg-[#0B0F15] text-white">
      {/* Top bar — cobalt platform icon */}
      <header
        className="fixed top-0 left-0 right-0 z-40 h-14 bg-[#0B0F15]/85 backdrop-blur-xl border-b border-white/5 px-3"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex h-14 items-center justify-between">
          <Link href="/preview/app-shell-v1" className="flex items-center" aria-label="Back to Slate360 home">
            <img
              src="/uploads/slate360-icon-cobalt.svg?v=cobalt-2026-04-21"
              alt="Slate360"
              width={36}
              height={36}
              className="h-9 w-9 object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.35)]"
            />
          </Link>
          <div className="text-xs text-slate-400">Site Walk Preview</div>
        </div>
      </header>

      {/* Main */}
      <main className="pt-16 pb-[88px] px-4 max-w-2xl mx-auto">
        {/* Quick Start */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Quick Start</h2>
            <button className="text-xs text-cobalt hover:text-cobalt-hover flex items-center gap-1">
              Customize <Plus className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_START.map(({ label, icon: Icon, desc }) => (
              <button
                key={label}
                className="flex flex-col items-start gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-cobalt/30 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-cobalt/15 border border-cobalt/30 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-cobalt" />
                </div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="text-xs text-slate-400">{desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Active / Recent Walks */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Recent Walks</h2>
            <Link href="#walks" className="text-xs text-cobalt hover:text-cobalt-hover flex items-center gap-1">
              Open Walks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-2">
            {RECENT_WALKS.map((w) => (
              <li
                key={w.name}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{w.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {w.items} items · {w.when}
                      {w.project && <span className="text-cobalt"> · {w.project}</span>}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 flex-shrink-0 mt-1" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent Deliverables */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Recent Deliverables</h2>
            <Link href="#deliverables" className="text-xs text-cobalt hover:text-cobalt-hover flex items-center gap-1">
              Open Deliverables <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-2">
            {RECENT_DELIVERABLES.map((d) => (
              <li
                key={d.name}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{d.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{d.type} · {d.when}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 flex-shrink-0 mt-1" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Metadata banner */}
        <section className="mb-6 rounded-xl border border-cobalt/20 bg-cobalt/5 p-3">
          <div className="text-xs text-cobalt font-semibold mb-1">Auto-recorded on every capture</div>
          <div className="text-xs text-slate-400">
            Time · GPS · Weather · Device. Embedded as photo EXIF + saved to walk record. Visibility per deliverable.
          </div>
        </section>

        {/* Back link */}
        <div className="text-center pb-4">
          <Link href="/preview/app-shell-v1" className="text-xs text-slate-500 hover:text-cobalt">
            ← Back to Slate360 home preview
          </Link>
        </div>
      </main>

      {/* Bottom nav — Site Walk module nav */}
      <nav
        aria-label="Site Walk"
        className="fixed bottom-0 left-0 right-0 z-40 h-[72px] bg-[#0B0F15]/85 backdrop-blur-xl border-t border-white/5"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="flex h-full items-stretch justify-around px-2">
          {SITE_WALK_NAV.map(({ label, href, icon: Icon }) => {
            const active = href === pathname;
            return (
              <li key={label} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    "relative flex flex-col items-center justify-center h-full gap-1 transition-colors",
                    active ? "text-cobalt" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-cobalt shadow-[0_2px_10px_rgba(59,130,246,0.45)]"
                    />
                  )}
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} className={cn("transition-transform", active && "-translate-y-0.5")} />
                  <span className={cn("text-[10px] font-medium leading-none", active && "font-semibold")}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
