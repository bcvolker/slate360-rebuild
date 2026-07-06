import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { isMobileServerLayout } from "@/lib/server/device-layout";

export const metadata = {
  title: "360° Tours",
};

// Mirrors app/(dashboard)/tours/layout.tsx's CEO-only gate (same hidden posture
// as Thermal Studio — the builder is gated, the deliverables it produces are
// public/token-gated). Non-mobile visitors are sent to the desktop builder,
// matching how app/(mobile)/app/page.tsx redirects non-mobile devices to
// /dashboard.
export default async function MobileToursLayout({ children }: { children: React.ReactNode }) {
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isSlateCeo) notFound();

  const isMobile = await isMobileServerLayout();
  if (!isMobile) redirect("/tours");

  return <div className="flex h-full min-h-0 w-full flex-col">{children}</div>;
}
