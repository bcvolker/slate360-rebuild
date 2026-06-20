import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Content Studio",
};

/**
 * Content Studio (internal CEO tool) — cloud-rendered video / 360 / photo editor.
 * CEO-only and hidden, same gate as Thermal / Design Studio. This is a DISTINCT
 * route from the legacy entitlement-gated (apps)/content-studio media library.
 */
export default async function ContentStudioWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isSlateCeo) notFound();

  // Full-bleed, height-bound chain: the workspace owns its single top bar and
  // fills the screen with NO page scroll (panels scroll internally).
  return (
    <div
      className="flex h-full min-h-0 w-full flex-col"
      data-mobile-route="platform"
      data-content-studio=""
    >
      {children}
    </div>
  );
}
