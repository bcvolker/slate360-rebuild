import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MarketingHomepage from "@/components/marketing-homepage";

export const metadata = {
  title: 'Slate360 - The real-time interactive bridge between the field and the office',
  description: 'Capture site conditions, organize project context, and turn field documentation into branded deliverables, immersive tours, and client-ready media from one connected platform.',
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
