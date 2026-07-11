import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Thermal Studio",
};

/**
 * Same CEO-only gate as /thermal-studio (V1) — TS-SD's real, authenticated
 * V2 route so SlateDrop deliverables can deep-link back into the editor.
 * /preview/thermal-v2 stays the unauthenticated build harness; this is the
 * live route, still reachable only by the CEO while S9 (the swap) is held.
 */
export default async function ThermalStudioV2Layout({ children }: { children: React.ReactNode }) {
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isSlateCeo) notFound();

  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-mobile-route="platform">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
