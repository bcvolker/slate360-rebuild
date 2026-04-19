import { createClient } from "@/lib/supabase/server";
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

  // Logged-in users may still want to view the marketing homepage
  // (e.g. clicking the Slate360 logo from the dashboard). The marketing
  // component swaps its CTAs based on isLoggedIn, so we just render it.
  return <MarketingHomepage isLoggedIn={!!user} />;
}
