/**
 * /pending-verification — V1 Foundational Release Approval Gate
 *
 * Standalone page (no AppShell, no nav). Shown to authenticated users
 * whose account_status is not 'approved' and who are not app reviewers.
 *
 * On every server render (including router.refresh() from the recheck
 * button), this checks current approval status and redirects approved
 * users straight to /dashboard.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Building2, ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/server/beta-access";
import { createAdminClient } from "@/lib/supabase/admin";
import BetaPendingRecheck from "@/components/shared/BetaPendingRecheck";

export const metadata = {
  title: "Pending Foundational Verification — Slate360",
};

type ProfileRow = {
  account_status: string | null;
  is_app_reviewer: boolean | null;
  signup_org_request: string | null;
  email: string | null;
};

export default async function PendingVerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated users → login
  if (!user) redirect("/login");

  // Owner always has access
  if (isOwnerEmail(user.email)) redirect("/dashboard");

  // Fetch full approval status
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("account_status, is_app_reviewer, signup_org_request, email")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  // Already approved or is a reviewer → send to dashboard
  if (
    profile?.account_status === "approved" ||
    profile?.is_app_reviewer === true
  ) {
    redirect("/dashboard");
  }

  const orgRequest = profile?.signup_org_request ?? null;
  const userEmail = profile?.email ?? user.email ?? null;

  return (
    <div className="dark flex min-h-[100dvh] items-center justify-center bg-[#0B0F15] p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/10 ring-1 ring-amber-400/20">
          <Clock className="h-8 w-8 text-amber-200" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Pending Foundational Verification
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Your account has been created. The Slate360 team reviews each
            request individually before granting access to the V1 Foundational
            Release.
          </p>
        </div>

        {/* Identity confirmed */}
        {userEmail && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <Mail className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate">{userEmail}</span>
          </div>
        )}

        {/* Org request */}
        {orgRequest && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{orgRequest}</span>
          </div>
        )}

        {/* What happens next */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm text-slate-400 backdrop-blur-md">
          <p className="mb-2 font-semibold text-slate-200">What happens next</p>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>Your request is in the review queue</li>
            <li>You will receive email confirmation when approved</li>
            <li>
              All data you create in V1 is retained for at least one year and
              carries a discount toward future Slate360 plans
            </li>
          </ul>
        </div>

        {/* Recheck button */}
        <BetaPendingRecheck />

        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
