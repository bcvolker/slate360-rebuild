"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Upload, FolderPlus, Camera, MapPin } from "lucide-react";

export function QuickActionsCard() {
  return (
    <Card className="bg-glass border-glass shadow-glass">
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
            className="h-auto py-3 flex-col gap-1.5 border-zinc-700 hover:border-primary hover:text-primary hover:bg-primary/5"
            asChild
          >
            <a href="/project-hub">
              <FolderPlus className="h-5 w-5" />
              <span className="text-xs">New Project</span>
            </a>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 border-zinc-700 hover:border-primary hover:text-primary hover:bg-primary/5"
            asChild
          >
            <a href="/slatedrop">
              <Upload className="h-5 w-5" />
              <span className="text-xs">Upload Files</span>
            </a>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 border-zinc-700 hover:border-primary hover:text-primary hover:bg-primary/5"
            asChild
          >
            <a href="/site-walk">
              <MapPin className="h-5 w-5" />
              <span className="text-xs">Site Walk</span>
            </a>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5 border-zinc-700 hover:border-primary hover:text-primary hover:bg-primary/5"
            asChild
          >
            <a href="/tours">
              <Camera className="h-5 w-5" />
              <span className="text-xs">360 Tour</span>
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
