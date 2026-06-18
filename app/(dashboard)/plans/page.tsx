import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { PlansCheckoutClient } from "./PlansCheckoutClient";

export const metadata = { title: "Plans & Pricing — Slate360" };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?redirectTo=/plans");

  const sp = await searchParams;
  const planRaw = sp.plan;
  const plan = typeof planRaw === "string" ? planRaw : null;
  const billing = sp.billing === "annual" ? "annual" : "monthly";

  // No plan selected → send to the homepage pricing section (source of truth).
  if (!plan) redirect("/#pricing");

  return <PlansCheckoutClient plan={plan} billing={billing} />;
}
