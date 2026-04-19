"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, FolderOpen, Loader2 } from "lucide-react";
import type { ProjectSummary } from "@/lib/types/command-center";

interface PendingItemsCardProps {
  data: ProjectSummary;
  isLoading: boolean;
}

export function PendingItemsCard({ data, isLoading }: PendingItemsCardProps) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl bg-glass border-glass shadow-glass">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const { totals, recentProjects } = data;
  const activeProjects = recentProjects.filter((p) => p.status === "active");

  return (
    <Card className="rounded-2xl bg-glass border-glass shadow-glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Active Projects
          </CardTitle>
          {totals.activeProjects > 0 && (
            <Badge className="bg-primary/20 text-primary border-primary/30">
              {totals.activeProjects} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeProjects.length > 0 ? (
          <>
            {activeProjects.slice(0, 5).map((p) => (
              <a
                key={p.id}
                href={`/project-hub/${p.id}`}
                className="flex items-center gap-3 rounded-lg bg-white/[0.04]/50 px-4 py-3 hover:bg-primary/10 transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              </a>
            ))}
            {totals.activeProjects > 5 && (
              <a href="/project-hub" className="block text-center text-xs text-primary hover:underline pt-1">
                View all {totals.activeProjects} active projects
              </a>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No active projects</p>
            <a href="/project-hub" className="text-sm text-primary hover:underline mt-1 inline-block">
              Create your first project
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
