import { redirect } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Coordination — Slate360" };
export const dynamic = "force-dynamic";

/**
 * /coordination — placeholder home for the Coordination Hub.
 * Wired up so the mobile bottom-nav "Coordination" tab no longer dumps
 * users into /my-account?tab=notifications. Real hub lands in PR #28.
 */
export default async function CoordinationPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination");

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cobalt-soft">
        <MessagesSquare className="h-7 w-7 text-cobalt" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Coordination Hub</h1>
      <p className="text-sm text-muted-foreground">
        One place for messages, RFIs, comments, and approvals across all your
        projects. Coming next — we&apos;re wiring it into Project Hub and Site
        Walk so threads follow the work, not the inbox.
      </p>
      <p className="text-xs text-muted-foreground/70">
        Notification preferences live under{" "}
        <a href="/my-account?tab=notifications" className="text-cobalt hover:underline">
          My Account → Notifications
        </a>
        .
      </p>
    </div>
  );
}
