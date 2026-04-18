"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlateLogo } from "@/components/shared/SlateLogo";

type Props = {
  title: string;
  backHref?: string;
  actions?: React.ReactNode;
};

export function SiteWalkHeader({ title, backHref, actions }: Props) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {backHref && (
        <Link
          href={backHref}
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <Link href="/dashboard" className="flex items-center" aria-label="Command Center">
        <SlateLogo className="h-5 w-auto" />
      </Link>
      <h1 className="truncate text-lg font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </header>
  );
}

type NavItem = { href: string; label: string; icon: React.ReactNode };

export function SiteWalkBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {items.map((item) => {
          const active = pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
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
