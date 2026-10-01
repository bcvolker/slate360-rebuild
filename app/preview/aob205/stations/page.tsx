import { aob205Experience as data } from "@/lib/client-experience/aob205-fixture";
import { StationExperience } from "@/components/client-experience/StationExperience";
import { readNumber, readString } from "@/lib/client-experience/utils";

type SP = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const panel = readString(sp.panel) as "plan" | "stations" | "items" | "share" | null;
  return <StationExperience data={data} initial={{ stationId: readString(sp.s) ?? data.stations[0].id, yaw: readNumber(sp.yaw, 0), pitch: readNumber(sp.pitch, 0), item: readString(sp.item), panel }} />;
}
