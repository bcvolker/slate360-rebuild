import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SW360BottomNav } from "@/components/sw360/SW360BottomNav";
import { SW360Header } from "@/components/sw360/SW360Header";
import { SAFE_AREA_INSET_BOTTOM } from "@/lib/capacitor/safe-area-inset";

function initialsFrom(name: string | null, email: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || "?";
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

/**
 * Auth-gated shell for every SW360 screen except /sw360/login — reuses the
 * existing (shared) auth/org backend, no new backend needed. Provides the
 * header + 5-tab bottom nav frame every (shell) screen renders inside.
 */
export default async function SW360ShellLayout({ children }: { children: React.ReactNode }) {
  const context = await resolveServerOrgContext();
  if (!context.user) {
    redirect("/sw360/login");
  }

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("full_name")
    .eq("id", context.user.id)
    .maybeSingle();
  const initials = initialsFrom(profile?.full_name ?? null, context.user.email ?? null);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SW360Header initials={initials} />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: `calc(4.75rem + ${SAFE_AREA_INSET_BOTTOM})` }}
      >
        {children}
      </main>
      <SW360BottomNav />
    </div>
  );
}
