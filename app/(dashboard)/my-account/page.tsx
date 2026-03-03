import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MyAccountShell from "@/components/dashboard/MyAccountShell";

export default async function MyAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/my-account");

  return <MyAccountShell userEmail={user.email ?? ""} />;
}
