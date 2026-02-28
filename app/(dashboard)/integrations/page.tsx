"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Link2, ChevronLeft, ChevronDown, LayoutDashboard, FolderKanban, BarChart3, FolderOpen, Plug } from "lucide-react";

const QUICK_NAV = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Project Hub",  href: "/project-hub",  icon: FolderKanban },
  { label: "Analytics",    href: "/analytics",    icon: BarChart3 },
  { label: "SlateDrop",    href: "/slatedrop",    icon: FolderOpen },
  { label: "Integrations", href: "/integrations", icon: Plug },
];

type IntegrationCard = {
  id: string;
  name: string;
  description: string;
};

const INTEGRATIONS: IntegrationCard[] = [
  {
    id: "microsoft-project",
    name: "Microsoft Project",
    description: "Sync project schedules and milestone updates between Slate360 and Microsoft Project.",
  },
  {
    id: "foundation-software",
    name: "Foundation Software",
    description: "Connect job-cost data and accounting records with bidirectional sync placeholders.",
  },
  {
    id: "procore",
    name: "Procore",
    description: "Exchange RFIs, submittals, and progress details across both systems.",
  },
  {
    id: "autodesk",
    name: "Autodesk",
    description: "Bridge design and model context between Autodesk workflows and Slate360.",
  },
];

export default function IntegrationsHubPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [quickNavOpen, setQuickNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#ECEEF2]">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="shrink-0">
              <img src="/logo.svg" alt="Slate360" className="h-7 w-auto" />
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#FF4D00] transition-colors"
            >
              <ChevronLeft size={16} /> Dashboard
            </Link>
            <span className="hidden sm:block text-gray-300">·</span>
            <span className="hidden sm:block text-sm font-bold text-gray-700">Integrations Hub</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setQuickNavOpen(!quickNavOpen)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <LayoutDashboard size={14} /> Navigate <ChevronDown size={12} />
            </button>
            {quickNavOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setQuickNavOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl py-2 overflow-hidden">
                  {QUICK_NAV.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setQuickNavOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-[#FF4D00]/5 hover:text-[#FF4D00] transition-colors"
                      >
                        <Icon size={14} /> {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">System Connections</p>
          <h1 className="text-2xl font-black text-gray-900">Integrations Hub</h1>
          <p className="mt-1 text-sm text-gray-600">Connect third-party tools using placeholder 2-way sync actions.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {INTEGRATIONS.map((integration) => {
            const isConnected = Boolean(connected[integration.id]);
            return (
              <article key={integration.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600">
                  <Link2 size={16} />
                </div>
                <h2 className="text-base font-black text-gray-900">{integration.name}</h2>
                <p className="mt-1 text-sm text-gray-600">{integration.description}</p>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setConnected((prev) => ({ ...prev, [integration.id]: !prev[integration.id] }))}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#FF4D00] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#E64500]"
                  >
                    <CheckCircle2 size={14} />
                    {isConnected ? "Connected" : "Connect (2-Way Sync)"}
                  </button>
                  <span className={`text-xs font-semibold ${isConnected ? "text-emerald-700" : "text-gray-500"}`}>
                    {isConnected ? "Ready" : "Not connected"}
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
