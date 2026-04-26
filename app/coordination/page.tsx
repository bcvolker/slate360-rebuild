import { redirect } from "next/navigation";

export const metadata = { title: "Coordination — Slate360" };
export const dynamic = "force-dynamic";

/**
 * /coordination redirects to the inbox because the notification bell should
 * land in the communication center, not a generic hub landing page.
 */
export default async function CoordinationPage() {
  redirect("/coordination/inbox");
}
