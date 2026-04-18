import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MarketingHomepage from "@/components/marketing-homepage";

export const metadata = {
  title: 'Slate360 - The Interactive and Visual Central Nervous System for All of Your Construction Projects',
  description: 'Slate360 Core + powerful add-ons. One place for tours, site walks, client portals, and secure file sharing. Client links never break.',
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, redirect them directly to the dashboard
  if (user) {
    redirect("/dashboard");
  }

  return <MarketingHomepage isLoggedIn={!!user} />;
}
