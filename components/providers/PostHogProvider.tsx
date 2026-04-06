"use client";

import { useEffect } from "react";

// Using posthog-js directly (no posthog-js/react context provider).
// posthog-js/react's PostHogProvider and usePathname() from next/navigation
// both produce "Cannot read properties of null (reading 'useXxx')" errors
// during SSR in Next.js 15 / React 19 because their internal React imports
// resolve to null in the server bundle. Tracking SPA pageviews is handled
// below using the History API, which only fires on the client.
//
// IMPORTANT: posthog-js must be dynamically imported inside useEffect so that
// webpack does NOT emit a module-level require(posthog-js) in the server chunk.
// A top-level `import posthog from "posthog-js"` produces a synchronous
// c(96078) call at module initialization time, which runs in the Sentry
// debug-id server chunk BEFORE React SSR initializes → null.useContext crash.

export function PostHogInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip analytics on the public deliverable viewer
    if (window.location.pathname.startsWith("/portal")) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key) return;

    import("posthog-js").then(({ default: posthog }) => {
      if (posthog.__loaded) return;
      posthog.init(key, {
        api_host: host || "https://us.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
      });
    });
  }, []);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PostHogInit />
      {children}
    </>
  );
}
