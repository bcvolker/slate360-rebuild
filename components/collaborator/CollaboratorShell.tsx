import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

type Props = {
  user: { name: string; email: string };
  projectName?: string | null;
  children: ReactNode;
};

/**
 * Stripped-down shell for users who joined Slate360 only as a project
 * collaborator (no subscription of their own). Hides modules they don't
 * have access to and surfaces a persistent upgrade banner.
 */
export function CollaboratorShell({ user, projectName, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/collaborator" className="flex items-center gap-2">
            <Image
              src="/uploads/slate360-logo-reversed-v2.svg?v=cobalt-2026-04-19"
              alt="Slate360"
              width={120}
              height={28}
              priority
            />
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </span>
            <Link
              href="/api/auth/sign-out"
              className="rounded border border-border px-2 py-1 hover:bg-muted"
            >
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <div className="bg-primary px-6 py-2 text-center text-xs font-medium text-primary-foreground">
        You're collaborating on {projectName ? `"${projectName}"` : "a Slate360 project"}.{" "}
        <Link href="/plans" className="underline">
          Get your own Slate360 to manage your work →
        </Link>
      </div>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-card sm:block">
          <nav className="flex flex-col gap-1 p-4 text-sm">
            <CollaboratorNavLink href="/collaborator">My projects</CollaboratorNavLink>
            <CollaboratorNavLink href="/collaborator/files">Shared files</CollaboratorNavLink>
            <CollaboratorNavLink href="/collaborator/comments">Comments</CollaboratorNavLink>
            <CollaboratorNavLink href="/collaborator/settings">Account</CollaboratorNavLink>
          </nav>
          <div className="mt-6 px-4 text-xs text-muted-foreground">
            <p className="leading-relaxed">
              You have read & comment access to whatever the project owner has shared with you.
              No subscription required.
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
      className="rounded px-3 py-2 text-foreground hover:bg-muted"
    >
      {children}
    </Link>
  );
}
