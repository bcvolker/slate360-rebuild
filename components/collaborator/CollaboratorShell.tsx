import type { ReactNode } from "react";
import Link from "next/link";
import { SlateLogo } from "@/components/shared/SlateLogo";
import { getCollaboratorEntitlements } from "@/lib/entitlements-collaborator";

type Props = {
  user: { name: string; email: string };
  projectName?: string | null;
  children: ReactNode;
};

/** Collect-only collaborators see capture + assigned-walk surfaces only.
 *  Nav is derived from the entitlement profile so denied features (studios,
 *  other projects, team) never get a link. */
const NAV_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/collaborator", label: "My projects" },
  { href: "/collaborator/files", label: "Shared files" },
  { href: "/collaborator/comments", label: "Comments" },
  { href: "/collaborator/settings", label: "Account" },
];

/**
 * Stripped-down shell for users who joined Slate360 only as a project
 * collaborator (no subscription of their own). Collect-only by design — see
 * `lib/entitlements-collaborator.ts`. Hides modules they don't have access to
 * and surfaces a persistent upgrade banner.
 */
export function CollaboratorShell({ user, projectName, children }: Props) {
  const ent = getCollaboratorEntitlements();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]">
      <header className="border-b border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_94%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/collaborator" className="flex items-center gap-2">
            <SlateLogo className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-3 text-xs text-[var(--graphite-muted)]">
            <span className="hidden sm:inline">
              Signed in as{" "}
              <span className="font-medium text-[var(--graphite-text-header)]">{user.email}</span>
            </span>
            <Link
              href="/api/auth/sign-out"
              className="rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 font-semibold transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)] hover:text-[var(--graphite-text-header)]"
            >
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] px-6 py-2 text-center text-xs font-medium text-[var(--graphite-text-body)]">
        You're collaborating on {projectName ? `"${projectName}"` : "a Slate360 project"}.{" "}
        <Link
          href="/plans"
          className="font-semibold text-[var(--graphite-primary)] underline-offset-2 hover:underline"
        >
          Get your own Slate360 to manage your work →
        </Link>
      </div>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] sm:block">
          <nav className="flex flex-col gap-1 p-4 text-sm">
            {NAV_LINKS.map((link) => (
              <CollaboratorNavLink key={link.href} href={link.href}>
                {link.label}
              </CollaboratorNavLink>
            ))}
          </nav>
          <div className="mt-6 px-4 text-xs text-[var(--graphite-muted)]">
            <p className="leading-relaxed">
              {ent.canCapture
                ? "You can capture and complete the walks shared with you. No subscription required."
                : "You have view & comment access to whatever the project owner has shared with you."}
            </p>
          </div>
        </aside>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function CollaboratorNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-[var(--graphite-text-body)] transition-colors hover:bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)] hover:text-[var(--graphite-text-header)]"
    >
      {children}
    </Link>
  );
}
