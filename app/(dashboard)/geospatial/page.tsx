import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GeospatialShell from "@/components/dashboard/GeospatialShell";

export default async function GeospatialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/geospatial");

  return <GeospatialShell />;
}
