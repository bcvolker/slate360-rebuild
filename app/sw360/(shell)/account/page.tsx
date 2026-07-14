"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Calendar, Users, ChevronRight } from "lucide-react";
import { SW360BackHeader } from "@/components/sw360/SW360BackHeader";

export default function SW360AccountPage() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sw360/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <SW360BackHeader href="/sw360" label="Home" />
      <h1 className="text-lg font-black text-[var(--sw360-charcoal)]">Account</h1>

      <div className="flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-white/70">
        <Link href="/sw360/calendar" className="flex min-h-[52px] items-center gap-3 px-4">
          <Calendar size={18} className="text-[var(--sw360-green-light)]" />
          <span className="flex-1 text-sm font-semibold text-[var(--sw360-charcoal)]">Calendar</span>
          <ChevronRight size={16} className="text-[var(--sw360-charcoal)]/40" />
        </Link>
        <Link href="/sw360/contacts" className="flex min-h-[52px] items-center gap-3 px-4">
          <Users size={18} className="text-[var(--sw360-green-light)]" />
          <span className="flex-1 text-sm font-semibold text-[var(--sw360-charcoal)]">Contacts</span>
          <ChevronRight size={16} className="text-[var(--sw360-charcoal)]/40" />
        </Link>
      </div>

      <p className="text-sm text-[var(--sw360-charcoal)]/60">
        Full account settings are coming in this build train.
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="flex min-h-[48px] w-fit items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--sw360-charcoal)]"
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}
