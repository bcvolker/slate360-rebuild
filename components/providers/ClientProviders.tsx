"use client";

// Client-only effects: theme application + PostHog analytics.
// Children always render server-side — we use the sibling pattern (not wrapping)
// to avoid next/dynamic ssr:false suppressing server rendering of page content.
//
// IMPORTANT: PostHogProvider must NOT be imported at the top level from any
// server-side module. When PostHogProvider.tsx is in a Sentry debug-id server
// chunk, its top-level `import { useEffect } from "react"` emits a synchronous
// c(93491) module-level require that can execute before React SSR initializes,
// causing "Cannot read properties of null (reading 'useEffect')" crashes.
// We load it via dynamic() with ssr:false to keep it browser-only.

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ThemeApplier = dynamic(
  () => import("@/components/providers/ThemeProvider").then((m) => ({
    default: m.ThemeApplier,
  })),
  { ssr: false, loading: () => null }
);

const PostHogInit = dynamic(
  () => import("@/components/providers/PostHogProvider").then((m) => ({
    default: m.PostHogInit,
  })),
  { ssr: false, loading: () => null }
);

const SWRegistrar = dynamic(
  () => import("@/components/providers/SWRegistrar").then((m) => ({
    default: m.SWRegistrar,
  })),
  { ssr: false, loading: () => null }
);

const OfflineBanner = dynamic(
  () => import("@/components/shared/OfflineBanner").then((m) => ({
    default: m.OfflineBanner,
  })),
  { ssr: false, loading: () => null }
);

const InstallBanner = dynamic(
  () => import("@/components/shared/InstallBanner").then((m) => ({
    default: m.InstallBanner,
  })),
  { ssr: false, loading: () => null }
);

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeApplier />
      <PostHogInit />
      <SWRegistrar />
      <OfflineBanner />
      <InstallBanner />
      {children}
    </>
  );
}
