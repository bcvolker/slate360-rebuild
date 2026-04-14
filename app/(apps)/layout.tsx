import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBetaAccess } from "@/lib/server/beta-access";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/apps/AppSidebar";
import { AppTopBar } from "@/components/apps/AppTopBar";

/**
 * Shared layout for the App Ecosystem route group.
 *
 * All standalone apps (Tour Builder, Site Walk, future apps) nest inside
 * this layout. It enforces authentication and provides the Linear-style
 * sidebar + top-bar chrome, visually quarantined from the marketing site.
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppTopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
