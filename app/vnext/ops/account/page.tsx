import { notFound } from "next/navigation";
import { VnextSignOut } from "@/components/vnext/VnextSignOut";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Account — Slate360" };

export default async function VnextOpsAccountPage() {
  const ctx = await requireVnextOwner("/vnext/ops/account");
  if (!ctx.user) notFound();
  return (
    <section className="vnext-portfolio mx-auto w-full max-w-[var(--vnext-content-max)] px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Account</h1>
      <p className="m-0 mt-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{ctx.user.email ?? "Signed in"}</p>
      <VnextSignOut />
    </section>
  );
}
