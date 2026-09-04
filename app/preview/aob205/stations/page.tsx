import { notFound } from "next/navigation";
import { experienceFromParams, type SP } from "../_variant";
import { StationExperience } from "@/components/client-experience/StationExperience";
import { readNumber, readString } from "@/lib/client-experience/utils";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const data = experienceFromParams(sp);
  if (!data.stations.length || !data.capabilities.stations) notFound();
  const panel = readString(sp.panel) as "plan" | "stations" | "items" | "more" | null;
  const from = readString(sp.from) === "walk" ? { t: readNumber(sp.t, 0), yaw: readNumber(sp.yaw, 0), pitch: readNumber(sp.pitch, 0) } : null;
  return <StationExperience data={data} initial={{ stationId: readString(sp.s) ?? data.stations[0].id, yaw: from ? 0 : readNumber(sp.yaw, 0), pitch: from ? 0 : readNumber(sp.pitch, 0), item: readString(sp.item), panel, ask: readString(sp.ask) === "1", from }} />;
}
