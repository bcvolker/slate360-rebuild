"use client";

import { createClient } from "@/lib/supabase/client";

export function VnextSignOut() {
  return (
    <button
      type="button"
      className="mt-6 inline-flex min-h-[var(--vnext-touch)] items-center border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-4 text-[length:var(--vnext-nav)] text-[var(--vnext-ink)]"
      onClick={() => {
        void createClient()
          .auth.signOut()
          .then(() => {
            window.location.href = "/login";
          });
      }}
    >
      Sign out
    </button>
  );
}
