import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import SiteWalkHomeClient from "./SiteWalkHomeClient";

export const metadata = { title: "Site Walk — Home" };
export const dynamic = "force-dynamic";

export default async function SiteWalkHomePage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/site-walk/home");

  const displayName =
    (ctx.user.user_metadata?.name as string | undefined)?.split(" ")[0] ??
    ctx.user.email?.split("@")[0] ??
    "there";

  return <SiteWalkHomeClient displayName={displayName} />;
}
