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
import { SlateLogo } from "@/components/shared/SlateLogo";
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
        <Link href="/">
          <SlateLogo />
        </Link>
        <Link href="/auth/logout" className="text-sm text-slate-300 hover:text-white">
          Sign out
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="auth-card w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/10 ring-1 ring-amber-400/20">
            <Clock className="h-8 w-8 text-amber-300" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900">Access review in progress</h1>
            <p className="text-sm leading-relaxed text-slate-600">
              Your account is verified. The Slate360 team reviews each Foundational Release request
              before workspace access is granted.
            </p>
          </div>

          {userEmail && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-600">
              <Mail className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate">{userEmail}</span>
            </div>
          )}

          {orgRequest && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-600">
              <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
              <span>{orgRequest}</span>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm text-slate-600">
            <p className="mb-2 font-semibold text-slate-900">What happens next</p>
            <ul className="list-inside list-disc space-y-1.5">
              <li>Your request is in the review queue</li>
              <li>You will receive email when access is approved</li>
              <li>Project data you create during early access is retained as Slate360 expands</li>
            </ul>
          </div>

          <BetaPendingRecheck />

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
