/**
 * /pending-verification — Foundational Release approval gate
 *
 * Standalone page (no AppShell). Shown to authenticated users whose
 * account_status is not 'approved' and who are not app reviewers.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Building2, ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/server/beta-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { SlateIcon } from "@/components/shared/SlateIcon";
import BetaPendingRecheck from "@/components/shared/BetaPendingRecheck";

export const metadata = {
  title: "Access review in progress — Slate360",
  description: "Your Foundational Release request is being reviewed.",
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

  if (!user) redirect("/login");

  if (isOwnerEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("account_status, is_app_reviewer, signup_org_request, email")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profile?.account_status === "approved" || profile?.is_app_reviewer === true) {
    redirect("/dashboard");
  }

  const orgRequest = profile?.signup_org_request ?? null;
  const userEmail = profile?.email ?? user.email ?? null;

  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <Link href="/" aria-label="Slate360 home">
          <SlateIcon className="h-9 w-9" />
        </Link>
        <Link href="/auth/logout" className="auth-topbar-link">
          Sign out
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="auth-card space-y-6 text-center">
          <div className="auth-icon-ring">
            <Clock className="h-8 w-8 text-[var(--graphite-primary)]" />
          </div>

          <div className="space-y-2">
            <h1 className="auth-heading">Access review in progress</h1>
            <p className="auth-subheading leading-relaxed">
              Your account is verified. The Slate360 team reviews each Foundational Release request
              before workspace access is granted.
            </p>
          </div>

          {userEmail && (
            <div className="auth-status-chip">
              <Mail className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
              <span className="truncate">{userEmail}</span>
            </div>
          )}

          {orgRequest && (
            <div className="auth-status-chip">
              <Building2 className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
              <span>{orgRequest}</span>
            </div>
          )}

          <div className="auth-info-panel">
            <p className="mb-2 font-semibold text-[var(--graphite-text-header)]">What happens next</p>
            <ul className="list-inside list-disc space-y-1.5">
              <li>Your request is in the review queue</li>
              <li>You will receive email when access is approved</li>
              <li>Project data you create during early access is retained as Slate360 expands</li>
            </ul>
          </div>

          <BetaPendingRecheck />

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm auth-muted transition-colors hover:text-[var(--graphite-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
