"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, FolderPlus, FolderOpen, Inbox, MapPin } from "lucide-react";

export function QuickActionsCard() {
  return (
    <Card className="rounded-2xl bg-glass border-glass shadow-glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 rounded-xl border-border hover:border-primary hover:text-primary hover:bg-primary/5"
            asChild
          >
            <Link href="/project-hub">
              <FolderPlus className="h-5 w-5" />
              <span className="text-xs">New Project</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 rounded-xl border-border hover:border-primary hover:text-primary hover:bg-primary/5"
            asChild
          >
            <Link href="/project-hub">
              <FolderOpen className="h-5 w-5" />
              <span className="text-xs">Open Projects</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 rounded-xl border-border hover:border-primary hover:text-primary hover:bg-primary/5"
            asChild
          >
            <Link href="/slatedrop">
              <Inbox className="h-5 w-5" />
              <span className="text-xs">Open SlateDrop</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 rounded-xl border-border hover:border-primary hover:text-primary hover:bg-primary/5"
            asChild
          >
            <Link href="/site-walk">
              <MapPin className="h-5 w-5" />
              <span className="text-xs">Start Site Walk</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
