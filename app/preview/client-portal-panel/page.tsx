import { ClientPortalPanelHarness } from "./ClientPortalPanelHarness";

export const dynamic = "force-dynamic";

/** Unauthenticated harness: the real ClientPortalPanel against a mocked package API. */
export default async function ClientPortalPanelPreview({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return (
    <main className="min-h-[100dvh] bg-[var(--graphite-canvas)] p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <ClientPortalPanelHarness state={state === "no-walkthrough" ? "no-walkthrough" : "ready"} />
      </div>
    </main>
  );
}
