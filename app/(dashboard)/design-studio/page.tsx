import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DesignStudioShell from "@/components/dashboard/DesignStudioShell";

export default async function DesignStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/design-studio");

  return <DesignStudioShell />;
}
