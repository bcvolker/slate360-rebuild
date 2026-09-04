import { aob205Experience as data } from "@/lib/client-experience/aob205-fixture";
import { PlanExperience } from "@/components/client-experience/PlanExperience";
import { readString } from "@/lib/client-experience/utils";

type SP = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const u = readString(sp.u), v = readString(sp.v);
  return <PlanExperience data={data} initial={{ u: u ? Number(u) : null, v: v ? Number(v) : null, item: readString(sp.item), visitId: readString(sp.visit) }} />;
}
