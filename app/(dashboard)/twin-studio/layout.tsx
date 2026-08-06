import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { canAccessTwinDesktop } from "@/lib/digital-twin/desktop-access";

export const metadata = {
  title: "Twin Studio",
};

/**
 * F1 (TWIN_SERVICE_STUDIO_PLAN.md Phase F) — the operator production cockpit,
 * gated the same way as the existing editor/cinematic/progression routes
 * (canAccessTwinDesktop: CEO, beta mode, or an org entitled for standalone
 * digital twin). Nav pre-filters to CEO-only (dashboard-nav-config.ts,
 * matching Thermal Studio's precedent); this is the real gate.
 */
export default async function TwinStudioLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?redirectTo=/twin-studio");
  if (!(await canAccessTwinDesktop(ctx))) notFound();

  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-mobile-route="platform">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
