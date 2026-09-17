import Link from "next/link";
import type { VnextNavItem } from "@/lib/vnext/nav";
import { isVnextNavActive } from "@/lib/vnext/nav";

type VnextNavLinkProps = {
  item: VnextNavItem;
  pathname: string;
  variant?: "header" | "sidebar" | "drawer";
  onNavigate?: () => void;
};

export function VnextNavLink({
  item,
  pathname,
  variant = "header",
  onNavigate,
}: VnextNavLinkProps) {
  const active = isVnextNavActive(pathname, item);
  const shared =
    "inline-flex min-h-[var(--vnext-touch)] items-center text-[length:var(--vnext-nav)] tracking-tight no-underline";

  if (variant === "sidebar" || variant === "drawer") {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={`${shared} w-full px-3 ${
          active
            ? "border-l-2 border-[var(--vnext-accent)] bg-[var(--vnext-accent-soft)] font-medium text-[var(--vnext-ink)]"
            : "border-l-2 border-transparent text-[var(--vnext-ink-secondary)] hover:bg-[var(--vnext-surface)] hover:text-[var(--vnext-ink)]"
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`${shared} px-3 ${
        active
          ? "border-b-2 border-[var(--vnext-accent)] font-medium text-[var(--vnext-ink)]"
          : "border-b-2 border-transparent text-[var(--vnext-ink-secondary)] hover:text-[var(--vnext-ink)]"
      }`}
    >
      {item.label}
    </Link>
  );
}
