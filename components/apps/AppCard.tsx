"use client";

import type { AppDefinition } from "./app-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AppCardProps {
  app: AppDefinition;
  onSelect: (app: AppDefinition) => void;
}

export function AppCard({ app, onSelect }: AppCardProps) {
  const Icon = app.icon;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(app)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(app);
        }
      }}
      className={cn(
        "cursor-pointer transition-colors hover:border-border/80 hover:bg-accent/50",
        "focus-visible:ring-2 focus-visible:ring-[var(--slate-accent-ring)] focus-visible:outline-none",
        !app.available && "opacity-60"
      )}
    >
      <CardContent className="flex items-start gap-4">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${app.color} 15%, transparent)` }}
        >
          <Icon className="size-5" style={{ color: app.color }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold leading-none">{app.name}</h3>
            {!app.available && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Coming Soon
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{app.tagline}</p>
          <p className="mt-2 text-lg font-bold text-[var(--slate-orange)]">{app.price}</p>
        </div>
      </CardContent>
    </Card>
  );
}
