import type { ReactNode } from "react";
import Link from "next/link";
import { VnextLogo } from "@/components/vnext/VnextLogo";
import type { PublicSection } from "@/lib/vnext/share/share-rules";
import { sharePath } from "@/lib/vnext/share/share-rules";

const LINK =
  "inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center px-2 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)] no-underline";

export function VnextPublicShell({
  token,
  projectName,
  sections,
  pathname,
  children,
}: {
  token: string;
  projectName: string;
  sections: PublicSection[];
  pathname: string;
  children: ReactNode;
}) {
  const root = sharePath(token);
  const nav = sections.map((section) => ({
    href: section === "overview" ? root : `${root}/${section}`,
    label: section === "overview" ? "Overview" : section === "explore" ? "Explore" : "History",
  }));
  return (
    <div data-vnext-shell="public" className="flex min-h-[100dvh] min-w-0 flex-col bg-[var(--vnext-canvas)]">
      <header className="sticky top-0 z-20 flex min-h-[var(--vnext-header-h)] items-center justify-between gap-3 border-b border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-[var(--vnext-pad-x)] pt-[env(safe-area-inset-top)]">
        <VnextLogo href={root} compact />
        <p className="m-0 min-w-0 flex-1 truncate text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{projectName}</p>
        <nav aria-label="Project" className="flex min-w-0 items-stretch">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== root && pathname.startsWith(`${item.href}/`));
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={LINK}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="min-w-0 flex-1 pb-[env(safe-area-inset-bottom)]">{children}</main>
    </div>
  );
}
