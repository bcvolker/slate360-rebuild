import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Plans & Pricing — Slate360" };

export default async function PlansPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?redirectTo=/plans");
  redirect("/#pricing");
}
