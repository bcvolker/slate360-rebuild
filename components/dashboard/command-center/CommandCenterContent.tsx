"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileText, FolderOpen, Pin, Plus, Search, Settings } from "lucide-react";

interface CommandCenterContentProps {
  userName: string;
  orgName: string;
  storageLimitGb: number;
}

export function CommandCenterContent({ userName, orgName, storageLimitGb }: CommandCenterContentProps) {
  const [query, setQuery] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {orgName || userName || "Slate360"}
        </p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Command Center
        </h1>
        <p className="text-sm text-zinc-400 sm:text-base">
          Blank canvas shell active
        </p>
        <p className="text-xs text-zinc-600">
          Storage limit configured: {storageLimitGb} GB
        </p>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="h-11 rounded-2xl border-zinc-800 bg-zinc-900 pl-10 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-[#D4AF37]"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white">
            <Link href="/projects">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open Projects
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white">
            <Link href="/projects">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white">
            <Link href="/install">
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white">
            <Link href="/my-account">
              <Settings className="mr-2 h-4 w-4" />
              My Account
            </Link>
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Pin className="h-4 w-4 text-[#D4AF37]" />
          <h2 className="text-lg font-semibold text-white">Pinned / Recent Projects</h2>
        </div>
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 px-4 py-8 text-sm text-zinc-400">
          {query.trim()
            ? "Search shell is active. Project results are intentionally hidden in this proof state."
            : "No pinned or recent projects to show yet."}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#D4AF37]" />
          <h2 className="text-lg font-semibold text-white">Files</h2>
        </div>
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 px-4 py-8 text-sm text-zinc-400">
          No recent files to show yet.
        </div>
      </section>
    </div>
  );
}
