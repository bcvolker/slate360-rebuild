"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, CheckCircle, PauseCircle, Loader2 } from "lucide-react";
import type { ProjectSummary } from "@/lib/types/command-center";

interface ProjectOverviewCardProps {
  data: ProjectSummary;
  isLoading: boolean;
}

export function ProjectOverviewCard({ data, isLoading }: ProjectOverviewCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-glass border-glass shadow-glass">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const { totals, recentProjects } = data;

  return (
    <Card className="bg-glass border-glass shadow-glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{totals.activeProjects}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{totals.completedProjects}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-3 text-center">
            <div className="text-2xl font-bold text-zinc-300">{totals.onHoldProjects}</div>
            <div className="text-xs text-muted-foreground">On Hold</div>
          </div>
        </div>

        {/* Recent projects list */}
        {recentProjects.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent</p>
            {recentProjects.slice(0, 4).map((p) => (
              <a
                key={p.id}
                href={`/project-hub/${p.id}/management`}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-primary/10 transition-colors group"
              >
                <span className="text-sm text-foreground group-hover:text-primary truncate">{p.name}</span>
                <Badge
                  variant="outline"
                  className={
                    p.status === "active"
                      ? "border-primary/30 text-primary text-xs"
                      : p.status === "completed"
                        ? "border-emerald-500/30 text-emerald-400 text-xs"
                        : "border-zinc-600 text-zinc-400 text-xs"
                  }
                >
                  {p.status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                  {p.status === "on-hold" && <PauseCircle className="h-3 w-3 mr-1" />}
                  {p.status}
                </Badge>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <a href="/project-hub" className="text-sm text-primary hover:underline mt-1 inline-block">
              Create your first project
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
