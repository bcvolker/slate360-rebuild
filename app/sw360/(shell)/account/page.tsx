"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
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
