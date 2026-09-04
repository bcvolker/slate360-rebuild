import { aob205Experience as data } from "@/lib/client-experience/aob205-fixture";
import { WalkExperience } from "@/components/client-experience/WalkExperience";
import { readNumber, readString } from "@/lib/client-experience/utils";

type SP = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const panel = readString(sp.panel) as "plan" | "items" | "spaces" | "share" | null;
  return <WalkExperience data={data} initial={{ t: readNumber(sp.t, 0), yaw: readNumber(sp.yaw, 0), pitch: readNumber(sp.pitch, 0), item: readString(sp.item), panel }} />;
}
