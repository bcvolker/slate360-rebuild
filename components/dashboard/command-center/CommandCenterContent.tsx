"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  ChevronRight,
  FileText,
  Pin,
  Search,
} from "lucide-react";
import {
  SlateContainedSection,
  SlateSubtleToggle,
} from "@/lib/design-system";
import type { Entitlements } from "@/lib/entitlements";
import { AppsGrid } from "@/components/dashboard/command-center/AppsGrid";

interface CommandCenterContentProps {
  userName: string;
  orgName: string;
  storageLimitGb: number;
  entitlements?: Entitlements | null;
}

export function CommandCenterContent({ userName, orgName, storageLimitGb, entitlements = null }: CommandCenterContentProps) {
  const [query, setQuery] = useState("");
  const [projectView, setProjectView] = useState("Pinned");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {orgName || userName || "Slate360"}
        </p>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          {userName ? `Welcome back, ${userName.split(" ")[0]}` : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Jump into your projects, apps, and recent work.
        </p>
      </section>

      {/* Search */}
      <section className="surface-raised p-4 sm:p-5">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="h-11 rounded-2xl border-border bg-muted/50 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
          />
        </div>
      </section>

      {/* Apps */}
      <AppsGrid entitlements={entitlements} />

      {/* Notifications / Work Feed Preview */}
      <section className="surface-raised p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Activity</h2>
          </div>
          <Link
            href="/coordination"
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-cobalt-hover transition-colors"
          >
            Coordination Hub
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <SlateContainedSection maxHeight="200px">
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground text-center">
            No recent activity to show yet.
          </div>
        </SlateContainedSection>
      </section>

      {/* Projects */}
      <section className="surface-raised p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Projects</h2>
          </div>
          <SlateSubtleToggle
            options={["Pinned", "All"]}
            active={projectView}
            onChange={setProjectView}
          />
        </div>
        <SlateContainedSection maxHeight="280px">
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground text-center">
            {query.trim()
              ? "Search shell is active. Project results are intentionally hidden in this proof state."
              : projectView === "Pinned"
                ? "No pinned projects yet. Pin a project for quick access."
                : "No projects to show yet."}
          </div>
        </SlateContainedSection>
      </section>

      {/* Files */}
      <section className="surface-raised p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Files</h2>
        </div>
        <SlateContainedSection maxHeight="240px">
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground text-center">
            No recent files to show yet.
          </div>
        </SlateContainedSection>
      </section>
    </div>
  );
}
