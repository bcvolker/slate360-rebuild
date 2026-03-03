import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VirtualStudioShell from "@/components/dashboard/VirtualStudioShell";

export default async function VirtualStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/virtual-studio");

  return <VirtualStudioShell />;
}
