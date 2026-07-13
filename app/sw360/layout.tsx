import type { Metadata } from "next";

/**
 * Site Walk 360 — standalone brand root. Scopes every screen under /sw360 to
 * the Field System tokens (app/globals.css [data-app="sw360"]) via a wrapper
 * div — deliberately NOT touching app/layout.tsx's <html>/<body>, so the
 * legacy Slate360 app is completely unaffected. B2.0: this + login + the Home
 * shell IS the "visible pivot" — no Slate360 chrome, nav, or branding may
 * appear anywhere under this tree.
 */
export const metadata: Metadata = {
  title: "Site Walk 360",
  description: "Field documentation, punch lists, and walk-throughs with drawings.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Site Walk 360",
  },
};

export default function SW360RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-app="sw360"
      className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]"
    >
      {children}
    </div>
  );
}
