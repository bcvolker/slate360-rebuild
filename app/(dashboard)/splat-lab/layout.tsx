import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Splat Lab — Slate360",
};

export default async function SplatLabLayout({ children }: { children: React.ReactNode }) {
  // Splat Lab is a CEO-only desktop quality-eval tool — never expose to other users.
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isSlateCeo) notFound();

  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-mobile-route="platform">
      <div className="min-h-0 flex-1 overflow-y-auto p-3 lg:p-4">{children}</div>
    </div>
  );
}
