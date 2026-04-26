import { createClient } from "@/lib/supabase/server";
import MarketingHomepage from "@/components/marketing-homepage";

export const metadata = {
  title: 'Slate360 - The connected app ecosystem for construction work',
  description: 'Run Site Walk, 360 Tours, Design Studio, Content Studio, SlateDrop, and Coordination from one connected construction app ecosystem.',
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
