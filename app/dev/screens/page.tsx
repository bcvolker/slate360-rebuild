import { Suspense } from "react";
import { DevScreensClient } from "@/components/dev/DevScreensClient";

export const metadata = {
  title: "Dev Screens — Slate360",
};

export default function DevScreensPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--graphite-canvas)] text-sm text-[var(--graphite-muted)]">
          Loading dev screens…
        </div>
      }
    >
      <DevScreensClient />
    </Suspense>
  );
}
