import { aob205Experience as data } from "@/lib/client-experience/aob205-fixture";
import { TwinExperience } from "@/components/client-experience/TwinExperience";
import { readString } from "@/lib/client-experience/utils";

type SP = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const panel = readString(sp.panel) as "plan" | "items" | "share" | null;
  return <TwinExperience data={data} initial={{ item: readString(sp.item), panel }} />;
}
