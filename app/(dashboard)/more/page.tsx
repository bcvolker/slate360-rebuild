import Link from "next/link";
import { Building2, ChevronRight, CreditCard, HardDrive, LifeBuoy, LogOut, MessageSquare, User, Wrench } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "More — Slate360",
};

type MoreItem = {
  label: string;
  href: string;
  icon: typeof User;
  danger?: boolean;
};

export default async function MorePage() {
  const { hasOperationsConsoleAccess } = await resolveServerOrgContext();

  const items: MoreItem[] = [
    { label: "Account", href: "/more/account", icon: User },
    { label: "Organization", href: "/more/organization", icon: Building2 },
    { label: "Billing & Apps", href: "/more/billing", icon: CreditCard },
    { label: "Coordination", href: "/coordination/inbox", icon: MessageSquare },
    { label: "Storage", href: "/slatedrop", icon: HardDrive },
    { label: "Legal / Support", href: "/more/support", icon: LifeBuoy },
  ];

  if (hasOperationsConsoleAccess) {
    items.push({ label: "Operations Console", href: "/operations-console", icon: Wrench });
  }

  items.push({ label: "Sign Out", href: "/auth/logout", icon: LogOut, danger: true });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 pb-28 text-slate-50 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">Utility</p>
        <h1 className="mt-1 text-2xl font-black text-white">More</h1>
      </header>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-md">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="flex min-h-16 items-center gap-3 border-b border-white/10 px-4 transition hover:bg-blue-500/10 last:border-b-0">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.danger ? "bg-rose-500/15 text-rose-200" : "bg-blue-600 text-white"}`}>
                  <Icon className="h-5 w-5" />
              </span>
              <span className={`min-w-0 flex-1 text-sm font-black ${item.danger ? "text-rose-200" : "text-white"}`}>{item.label}</span>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </Link>
          );
        })}
      </section>
    </div>
  );
}
