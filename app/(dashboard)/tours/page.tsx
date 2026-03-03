import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ToursShell from "@/components/dashboard/ToursShell";

export default async function ToursPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/tours");

  return <ToursShell />;
}
