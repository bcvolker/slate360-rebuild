"use client";

import Link from "next/link";
import { FolderOpen, Plus, Search } from "lucide-react";
import { useState } from "react";
import { SiteWalkHeader } from "@/components/site-walk/SiteWalkNav";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Project = { id: string; name: string; status: string; created_at: string };

export function ProjectSelectorClient({ projects }: { projects: Project[] }) {
  const [search, setSearch] = useState("");
  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <SiteWalkHeader title="Site Walk" />
      <main className="flex-1 px-4 pb-6 pt-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <FolderOpen className="h-10 w-10" />
            <p className="text-sm">
              {projects.length === 0
                ? "No projects yet. Create one in the Project Hub."
                : "No matching projects."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((project) => (
              <Link key={project.id} href={`/site-walk/${project.id}/sessions`}>
                <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-accent">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{project.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {project.status}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
