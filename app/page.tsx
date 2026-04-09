import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/home/LandingPage";

export const metadata = {
  title: 'Slate360 - The Nervous System for Construction Deliverables',
  description: 'Slate360 Core + powerful add-ons. One place for tours, site walks, client portals, and secure file sharing. Client links never break.',
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <LandingPage />;
}
