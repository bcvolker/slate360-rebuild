import Link from "next/link";
import { Building2, ChevronRight, CreditCard, HardDrive, LifeBuoy, MessageSquare, User, Wrench } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { SignOutRow } from "./_components/SignOutRow";

export const metadata = {
  title: "More — Slate360",
};

type MoreItem = {
  label: string;
  href: string;
  icon: typeof User;
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 pb-28 text-slate-50 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-md">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="flex min-h-16 items-center gap-3 border-b border-white/10 px-4 transition hover:bg-amber-500/10 last:border-b-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950">
                  <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-black text-white">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </Link>
          );
        })}
        <SignOutRow />
      </section>
    </div>
  );
}
