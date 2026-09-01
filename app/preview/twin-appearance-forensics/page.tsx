import { ForensicsClient } from "@/app/preview/twin-appearance-forensics/client";
import { KITCHEN_APPEARANCE_KIND, KITCHEN_PROOF_JOB } from "@/lib/digital-twin/kitchen-proof-world";

export const dynamic = "force-dynamic";

export default async function TwinAppearanceForensicsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const spzUrl = `/preview/twin-metric/asset?job=${KITCHEN_PROOF_JOB}&kind=${KITCHEN_APPEARANCE_KIND}`;
  return <ForensicsClient spzUrl={spzUrl} search={search} />;
}
