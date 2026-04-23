import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail, checkBetaApproved } from "@/lib/server/beta-access";
import BetaPendingRecheck from "@/components/shared/BetaPendingRecheck";

export const metadata = {
  title: "Beta Access Pending — Slate360",
};

export default async function BetaPendingPage() {
  // If the user is now approved (or is the owner), send them to dashboard.
  // This runs on every server render, including when the client calls
  // router.refresh() via the recheck button.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const approved =
      isOwnerEmail(user.email) || (await checkBetaApproved(user.id));
    if (approved) redirect("/dashboard");
  }

  return (
    <div className="dark min-h-screen bg-app-page flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Beta Access Pending</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Your account has been created, but beta access has not been granted yet.
            You will receive a notification when your access is approved.
          </p>
        </div>

        <div className="rounded-2xl border border-app bg-app-card p-4 text-left text-sm text-zinc-400 space-y-1.5">
          <p className="font-medium text-zinc-300">What happens next?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>The Slate360 team reviews new accounts</li>
            <li>Approved users gain full dashboard access</li>
            <li>You&apos;ll be notified when your access is ready</li>
          </ul>
        </div>

        <BetaPendingRecheck />

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-teal transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
