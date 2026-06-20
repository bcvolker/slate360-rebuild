import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Design Studio",
};

// Design Studio (the Unreal tab) is CEO-only — same private-tool gate as Thermal Studio.
// Eventually entitlement-gated for subscribers; for now isSlateCeo only.
export default async function DesignStudioLayout({ children }: { children: React.ReactNode }) {
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isSlateCeo) notFound();

  // Height-bound the whole chain so the workspace fills the screen with NO page scroll
  // (internal panels scroll instead). Matches the thermal-studio layout pattern.
  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-mobile-route="platform">
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
