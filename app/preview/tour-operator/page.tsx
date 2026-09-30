import { TourOperatorHarness } from "./TourOperatorHarness";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated harness for the Directed Tour operator page. Needs a live public share
 * token for the HouseWalk engineering fixture in `?token=`; everything else is mocked.
 */
export default async function TourOperatorPreview({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; state?: string }>;
}) {
  const { token, state } = await searchParams;
  return (
    <main className="min-h-[100dvh] bg-[var(--graphite-canvas)] p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <TourOperatorHarness
          token={token ?? ""}
          walkthroughId="7e0575a3-5d55-45d8-807f-9fb959ce2c21"
          clipId="f278d37f-1c2f-4511-aef5-437b3992d39d"
          durationS={51.1}
          withRoute={state !== "no-route"}
        />
      </div>
    </main>
  );
}
