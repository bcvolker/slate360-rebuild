"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Rocket } from "lucide-react";
import { APPS, type AppDefinition } from "@/components/apps/app-data";
import { AppCard } from "@/components/apps/AppCard";
import { AppPreviewSheet } from "@/components/apps/AppPreviewSheet";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Badge } from "@/components/ui/badge";

export default function AppsPage() {
  return (
    <Suspense fallback={null}>
      <AppsContent />
    </Suspense>
  );
}

function AppsContent() {
  const searchParams = useSearchParams();
  const [selectedApp, setSelectedApp] = useState<AppDefinition | null>(null);

  const billingState = searchParams?.get("app_billing") ?? null;
  const appParam = searchParams?.get("app") ?? null;

  return (
    <main className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--slate-orange-light)]">
              <Rocket className="size-5 text-[var(--slate-orange)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Slate360 Apps</h1>
              <p className="text-sm text-muted-foreground">
                Subscribe to standalone apps — no platform tier required.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Billing status banners */}
        {billingState === "success" && appParam && (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Badge variant="secondary" className="mr-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              Success
            </Badge>
            Checkout completed for{" "}
            <strong>{appParam === "tour_builder" ? "Tour Builder" : "PunchWalk"}</strong>.
            Refresh to verify access.
          </div>
        )}

        {billingState === "cancelled" && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            Checkout was cancelled before payment completion.
          </div>
        )}

        {/* App Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map((app) => (
            <AppCard key={app.id} app={app} onSelect={setSelectedApp} />
          ))}
        </div>

        {/* Preview Sheet */}
        <AppPreviewSheet
          app={selectedApp}
          open={selectedApp !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedApp(null);
          }}
        />
      </div>
    </main>
  );
}
