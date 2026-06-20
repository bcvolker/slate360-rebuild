import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Thermal Studio",
};

export default async function ThermalOpsLayout({ children }: { children: React.ReactNode }) {
  // Thermal Studio is CEO-only — staff with Operations Console access must NOT reach it.
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isSlateCeo) notFound();

  // Full-bleed, height-bound chain (Design Studio pattern) so the session workspace
  // owns its own single top bar and fills the screen with NO page scroll. The session
  // shell renders its own chrome; list/upload/templates pages scroll internally.
  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-mobile-route="platform">
      <div className="min-h-0 flex-1 overflow-y-auto p-3 lg:p-4">{children}</div>
    </div>
  );
}
