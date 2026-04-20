import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WelcomeClient } from "@/components/welcome/WelcomeClient";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Skip welcome if already onboarded.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at, first_name")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  const firstName =
    (profile?.first_name as string | null) ??
    (user.user_metadata?.first_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    "";

  return (
    <WelcomeClient
      user={{
        id: user.id,
        email: user.email ?? "",
        name: firstName,
      }}
    />
  );
}
