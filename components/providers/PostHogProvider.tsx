"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

function PostHogInit() {
  const pathname = usePathname();

  useEffect(() => {
    // Do NOT track external clients on /portal (deliverable viewer)
    if (pathname.startsWith("/portal")) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || posthog.__loaded) return;

    posthog.init(key, {
      api_host: host || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // we handle manually below
      capture_pageleave: true,
      autocapture: true,
    });
  }, [pathname]);

  // Manual pageview on route change (SPA navigation)
  useEffect(() => {
    if (pathname.startsWith("/portal")) return;
    if (posthog.__loaded) {
      posthog.capture("$pageview");
    }
  }, [pathname]);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PHProvider client={posthog}>
      <PostHogInit />
      {children}
    </PHProvider>
  );
}
