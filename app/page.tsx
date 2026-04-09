import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/home/LandingPage";

export const metadata = {
  title: "Slate360 — The Complete Platform for Construction Documentation",
  description:
    "Capture, organize, and share project progress with GPS-tagged photos, immersive 360° tours, and professional design tools. All in one platform.",
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <LandingPage />;
}
