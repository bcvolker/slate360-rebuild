"use client";

import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import type { AppDefinition, AppId } from "./app-data";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AppPreviewSheetProps {
  app: AppDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppPreviewSheet({ app, open, onOpenChange }: AppPreviewSheetProps) {
  const [loading, setLoading] = useState<AppId | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!app) return null;

  const Icon = app.icon;

  async function handleSubscribe(appId: AppId) {
    setLoading(appId);
    setError(null);

    try {
      const res = await fetch("/api/billing/app-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });

      const data: { url?: string; error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Checkout failed");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${app.color} 15%, transparent)` }}
            >
              <Icon className="size-5" style={{ color: app.color }} />
            </div>
            <div>
              <SheetTitle className="flex items-center gap-2">
                {app.name}
                {!app.available && (
                  <Badge variant="secondary" className="text-[10px]">
                    Coming Soon
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription>{app.tagline}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {/* Preview placeholder */}
        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted/50">
          <div className="text-center">
            <Icon className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">Preview coming soon</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-sm font-semibold">About</h4>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{app.description}</p>
        </div>

        {/* Features */}
        <div>
          <h4 className="text-sm font-semibold">Features</h4>
          <ul className="mt-2 space-y-2">
            {app.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--primary)]" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Pricing + CTA */}
        <div className="mt-auto space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{app.price}</span>
            <span className="text-xs text-muted-foreground">billed monthly</span>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {app.available ? (
            <Button
              className="w-full bg-[var(--primary)] text-foreground hover:bg-[var(--primary-hover)]"
              onClick={() => handleSubscribe(app.id)}
              disabled={loading !== null}
            >
              {loading === app.id ? (
                "Redirecting to Stripe…"
              ) : (
                <>
                  Subscribe to {app.name}
                  <ExternalLink className="size-3.5" />
                </>
              )}
            </Button>
          ) : (
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
