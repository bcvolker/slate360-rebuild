import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContentStudioShell from "@/components/dashboard/ContentStudioShell";

export default async function ContentStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/content-studio");

  return <ContentStudioShell />;
}
