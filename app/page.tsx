import { createClient } from "@/lib/supabase/server";
import MarketingHomepage from "@/components/marketing-homepage";

export const metadata = {
  title: "Slate360 — Field-to-office construction documentation",
  description:
    "Slate360 connects site capture with office review. Site Walk turns contextual field documentation into branded deliverables, with SlateDrop and Coordination keeping projects aligned.",
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <MarketingHomepage isLoggedIn={!!user} />;
}
