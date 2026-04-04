import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import SlateDropClient from "@/components/slatedrop/SlateDropClient";

export const metadata = {
  title: "SlateDrop — Slate360",
};

export default async function SlateDropPage() {
  const { user, tier } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/slatedrop");

  return (
    <SlateDropClient
      user={{
        name:
          user.user_metadata?.full_name ??
          user.email?.split("@")[0] ??
          "User",
        email: user.email ?? "",
      }}
      tier={tier}
    />
  );
}
