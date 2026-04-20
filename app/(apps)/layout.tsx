import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBetaAccess } from "@/lib/server/beta-access";
import AuthedAppShell from "@/components/dashboard/AuthedAppShell";

/**
 * Shared layout for the App Ecosystem route group.
 *
 * Routes inside this group inherit the SAME sidebar + topbar chrome as the
 * Command Center via AuthedAppShell. This is intentional: every authenticated
 * page must look identical at the chrome level so users always know where
 * they are in the product. Page-level content paints inside <main>; chrome
 * stays put.
 */
export default async function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await requireBetaAccess(user);

  return <AuthedAppShell>{children}</AuthedAppShell>;
}
