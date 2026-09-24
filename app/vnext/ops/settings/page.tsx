import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Settings — Slate360" };

export default async function VnextOpsSettingsPage() {
  await requireVnextOwner("/vnext/ops/settings");
  return (
    <section className="vnext-portfolio mx-auto w-full max-w-[var(--vnext-content-max)] px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Settings</h1>
      <p className="m-0 mt-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
        Project scope and publication stay on each project. Share links stay on Shares.
      </p>
    </section>
  );
}
