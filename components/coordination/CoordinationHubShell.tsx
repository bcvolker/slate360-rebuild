import Link from "next/link";
import { CalendarDays, Inbox, Users2, type LucideIcon } from "lucide-react";

const tabs: { label: string; href: string; icon: LucideIcon; detail: string }[] = [
  {
    label: "Inbox",
    href: "/coordination/inbox",
    icon: Inbox,
    detail: "Messages, received files, stakeholder responses, and feedback replies.",
  },
  {
    label: "Contacts",
    href: "/coordination/contacts",
    icon: Users2,
    detail: "Global and project-scoped stakeholder lists for fast outreach.",
  },
  {
    label: "Calendar",
    href: "/coordination/calendar",
    icon: CalendarDays,
    detail: "Schedule-aware planning with iOS, Android, and higher-tier Site Walk sync.",
  },
];

export function CoordinationHubShell({
  active,
  title,
  eyebrow,
  description,
  children,
}: {
  active: "inbox" | "contacts" | "calendar";
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 text-slate-50 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
      </section>

      <nav className="grid gap-3 sm:grid-cols-3" aria-label="Coordination sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.href.replace("/coordination/", "");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={selected ? "page" : undefined}
              className={`rounded-3xl border p-4 shadow-lg backdrop-blur-md transition hover:border-blue-400/70 hover:bg-blue-500/10 ${selected ? "border-blue-400/70 bg-blue-500/15" : "border-white/10 bg-white/5"}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white ring-1 ring-white/10">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-white">{tab.label}</p>
                  <p className="text-xs leading-5 text-slate-400">{tab.detail}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
