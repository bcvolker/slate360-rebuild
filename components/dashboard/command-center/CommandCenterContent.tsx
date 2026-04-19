"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  Pin,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import {
  SlateContainedSection,
  SlateSubtleToggle,
} from "@/lib/design-system";

interface CommandCenterContentProps {
  userName: string;
  orgName: string;
  storageLimitGb: number;
}

export function CommandCenterContent({ userName, orgName, storageLimitGb }: CommandCenterContentProps) {
  const [query, setQuery] = useState("");
  const [projectView, setProjectView] = useState("Pinned");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {orgName || userName || "Slate360"}
        </p>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Command Center
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Your workspace at a glance
        </p>
        <p className="text-xs text-muted-foreground/50">
          Storage limit: {storageLimitGb} GB
        </p>
      </section>

      {/* Search */}
      <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
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

      {/* Quick Actions */}
      <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="rounded-xl border-border hover:border-teal hover:text-teal transition-all">
            <Link href="/projects">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open Projects
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-border hover:border-teal hover:text-teal transition-all">
            <Link href="/projects">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-border hover:border-teal hover:text-teal transition-all">
            <Link href="/install">
              <Download className="mr-2 h-4 w-4" />
              Install App
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-border hover:border-teal hover:text-teal transition-all">
            <Link href="/my-account">
              <Settings className="mr-2 h-4 w-4" />
              My Account
            </Link>
          </Button>
        </div>
      </section>

      {/* Notifications / Work Feed Preview */}
      <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Activity</h2>
          </div>
          <Link
            href="/my-account?tab=notifications"
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-teal transition-colors"
          >
            Communications Center
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
      <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
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
      <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
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
