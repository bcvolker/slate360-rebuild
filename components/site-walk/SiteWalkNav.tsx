"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlateLogoOnLight } from "@/components/shared/SlateLogoOnLight";

type Props = {
  title: string;
  backHref?: string;
  actions?: React.ReactNode;
};

export function SiteWalkHeader({ title, backHref, actions }: Props) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-app bg-app-page/80 px-4 backdrop-blur-xl">
      {backHref && (
        <Link
          href={backHref}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.04] hover:text-teal transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <Link href="/dashboard" className="flex items-center" aria-label="Command Center">
        <SlateLogoOnLight className="h-5 w-auto" />
      </Link>
      <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </header>
  );
}

type NavItem = { href: string; label: string; icon: React.ReactNode };

export function SiteWalkBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-app bg-app-page/80 pb-safe backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {items.map((item) => {
          const active = pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-teal",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
