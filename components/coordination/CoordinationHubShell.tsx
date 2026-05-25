import Link from "next/link";
import { CalendarDays, Inbox, Users2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "@/components/mobile-system/mobileTokens";

const tabs: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Inbox",    href: "/coordination/inbox",    icon: Inbox },
  { label: "Contacts", href: "/coordination/contacts",  icon: Users2 },
  { label: "Calendar", href: "/coordination/calendar",  icon: CalendarDays },
];

const navCardBase =
  "rounded-xl border border-white/[0.06] bg-white/[0.04] p-4 transition-colors hover:border-[#6EA7A0]/25 hover:bg-white/[0.07]";
const navCardSelected = "border-[#6EA7A0]/35 bg-slate-900/40";
const navIconWell =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#6EA7A0]/30 bg-[#6EA7A0]/10 text-[#6EA7A0]";

export function CoordinationHubShell({
  active,
  title,
  eyebrow,
  children,
}: {
  active: "inbox" | "contacts" | "calendar";
  title: string;
  eyebrow: string;
  description?: string; // kept in signature for backward compat; not rendered
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col text-zinc-100",
        mobileTokens.mobileShellContentPaddingX,
        mobileTokens.mobileShellContentTopGap,
        mobileTokens.mobileShellContentStackGap,
        "pb-5 sm:px-6 lg:px-8 lg:pb-8",
      )}
    >
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-4 sm:px-5 sm:py-5">
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#A3AED0]">{eyebrow}</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
      </section>

      <nav className="grid gap-2.5 sm:grid-cols-3" aria-label="Coordination sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.href.replace("/coordination/", "");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={selected ? "page" : undefined}
              className={cn(navCardBase, selected && navCardSelected)}
            >
              <div className="flex items-center gap-3">
                <span className={navIconWell}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className="text-sm font-semibold text-zinc-100">{tab.label}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
