import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "360° Tours",
};

export default async function ToursLayout({ children }: { children: React.ReactNode }) {
  // 360° Tour Builder is CEO-only for now (same posture as Thermal Studio). It still
  // produces public, token-gated, no-login deliverables — but the BUILDER is gated.
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isSlateCeo) notFound();

  // Full-bleed, height-bound chain so the workspace owns its single top bar and fills
  // the screen with NO page scroll. Inner panels scroll internally.
  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-mobile-route="platform">
      <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-4">{children}</div>
    </div>
  );
}
