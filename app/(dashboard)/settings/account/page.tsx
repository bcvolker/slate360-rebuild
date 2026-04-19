import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardHeader from "@/components/shared/DashboardHeader";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ChevronRight, LogOut, Mail, Shield, KeyRound, CreditCard } from "lucide-react";

export const metadata = {
  title: "Account — Slate360",
};

export default async function AccountSettingsPage() {
  const { user, tier, isSlateCeo, canAccessOperationsConsole } = await resolveServerOrgContext();

  if (!user) {
    redirect("/login?redirectTo=%2Fsettings%2Faccount");
  }

  const email = user.email ?? "—";
  const initials = (email.split("@")[0] || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-dvh bg-app-page text-foreground">
      <DashboardHeader
        user={{ name: email, email }}
        tier={tier}
        isCeo={isSlateCeo}
        internalAccess={{ operationsConsole: canAccessOperationsConsole }}
        showBackLink
      />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your Slate360 profile, sign-in, and subscription.
          </p>
        </header>

        {/* Profile card */}
        <section className="rounded-2xl border border-app bg-app-card p-6 shadow-app-glow">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 text-lg font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{email}</p>
              <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
                {tier} plan
              </p>
            </div>
          </div>
        </section>

        {/* Account actions */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-app bg-app-card">
          <AccountRow
            href="/forgot-password"
            icon={<KeyRound className="h-4 w-4" />}
            label="Change password"
            hint="Send yourself a reset link"
          />
          <AccountRow
            href="/dashboard"
            icon={<Mail className="h-4 w-4" />}
            label="Email preferences"
            hint="Coming soon"
            disabled
          />
          <AccountRow
            href="/dashboard"
            icon={<Shield className="h-4 w-4" />}
            label="Two-factor authentication"
            hint="Coming soon"
            disabled
          />
          <AccountRow
            href="/dashboard"
            icon={<CreditCard className="h-4 w-4" />}
            label="Billing & subscription"
            hint="Manage in Stripe portal"
          />
        </section>

        {/* Sign out */}
        <section className="mt-6">
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-app bg-app-card px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-teal"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Need help? Email{" "}
          <Link href="mailto:support@slate360.ai" className="text-teal hover:text-primary transition-colors">
            support@slate360.ai
          </Link>
        </p>
      </main>
    </div>
  );
}

function AccountRow({
  href,
  icon,
  label,
  hint,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const inner = (
    <div className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.04]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
      {!disabled && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </div>
  );

  if (disabled) {
    return <div className="border-b border-app last:border-b-0 opacity-60 cursor-not-allowed">{inner}</div>;
  }
  return (
    <Link href={href} className="block border-b border-app last:border-b-0">
      {inner}
    </Link>
  );
}
