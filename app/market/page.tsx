import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MarketClient from "@/components/dashboard/MarketClient";

const CEO_EMAIL = "slate360ceo@gmail.com";

export const metadata = {
  title: "Market Robot — Slate360",
};

export default async function MarketPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // CEO-only gate
  if (user.email !== CEO_EMAIL) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MarketClient />
      </div>
    </div>
  );
}
