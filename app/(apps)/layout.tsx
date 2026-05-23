import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireBetaAccess } from "@/lib/server/beta-access";
import StudioAuthedShell from "@/components/studio-ui/StudioAuthedShell";

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

  return <StudioAuthedShell>{children}</StudioAuthedShell>;
}
