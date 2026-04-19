"use client";

/**
 * UserMenu — Avatar + dropdown for the dashboard header.
 * Extracted from DashboardHeader for size compliance.
 *
 * Billing entry is hidden for non-admins so enterprise members
 * cannot see the org's billing portal.
 */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ChevronDown, CreditCard, Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserMenuProps {
  user: { name: string; email: string; avatar?: string };
  tierLabel: string;
  isAdmin?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserMenu({
  user,
  tierLabel,
  isAdmin = true,
  open,
  onOpenChange,
}: UserMenuProps) {
  const router = useRouter();
  const [billingBusy, setBillingBusy] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleOpenBillingPortal = async () => {
    setBillingBusy(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data?.url) window.location.href = data.url;
    } finally {
      setBillingBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:pl-2 sm:pr-3 sm:py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors"
      >
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
          <p className="text-[10px] text-zinc-400 leading-tight">{tierLabel} plan</p>
        </div>
        <ChevronDown size={14} className="hidden sm:block text-zinc-500" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
          <div className="absolute right-0 top-12 w-56 bg-app-card rounded-xl border border-app shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-app">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-xs text-zinc-400 truncate">{user.email}</p>
              <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-primary-foreground bg-primary">
                {tierLabel}
              </span>
            </div>
            <div className="py-1">
              <Link
                href="/my-account"
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] transition-colors"
              >
                <Activity size={15} /> My Account
              </Link>
              {isAdmin && (
                <button
                  onClick={handleOpenBillingPortal}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] transition-colors"
                >
                  {billingBusy ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                  Billing &amp; Payments
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
