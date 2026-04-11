"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileCheck, ClipboardList, Loader2 } from "lucide-react";
import type { ProjectSummary } from "@/lib/types/command-center";

interface PendingItemsCardProps {
  data: ProjectSummary;
  isLoading: boolean;
}

export function PendingItemsCard({ data, isLoading }: PendingItemsCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-glass border-glass shadow-glass">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const { work, budget } = data;
  const totalPending = work.openRfis + work.pendingSubmittals;

  return (
    <Card className="bg-glass border-glass shadow-glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Pending Items
          </CardTitle>
          {totalPending > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {totalPending} open
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* RFIs */}
        <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Open RFIs</p>
              <p className="text-xs text-muted-foreground">Requests for Information</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-foreground">{work.openRfis}</span>
        </div>

        {/* Submittals */}
        <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileCheck className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Pending Submittals</p>
              <p className="text-xs text-muted-foreground">Awaiting review or approval</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-foreground">{work.pendingSubmittals}</span>
        </div>

        {/* Budget snapshot */}
        {budget.totalBudget > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Budget utilization</p>
              <p className="text-sm font-medium text-foreground">
                ${budget.totalSpent.toLocaleString()} / ${budget.totalBudget.toLocaleString()}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              {budget.totalBudget > 0 ? Math.round((budget.totalSpent / budget.totalBudget) * 100) : 0}%
            </span>
          </div>
        )}

        {totalPending === 0 && budget.totalBudget === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">All clear — nothing pending</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
