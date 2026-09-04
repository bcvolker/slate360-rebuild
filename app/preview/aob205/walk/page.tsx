import { notFound } from "next/navigation";
import { experienceFromParams, type SP } from "../_variant";
import { WalkExperience } from "@/components/client-experience/WalkExperience";
import { readNumber, readString } from "@/lib/client-experience/utils";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const data = experienceFromParams(sp);
  if (!data.walkthrough || !data.capabilities.walkthrough) notFound();
  const panel = readString(sp.panel) as "plan" | "items" | "spaces" | "more" | null;
  const path = readString(sp.path);
  return <WalkExperience data={data} initial={{ t: readNumber(sp.t, 0), yaw: readNumber(sp.yaw, 0), pitch: readNumber(sp.pitch, 0), item: readString(sp.item), panel, mode: readString(sp.mode) === "play" ? "play" : "explore", ask: readString(sp.ask) === "1", path: path === "on" ? true : path === "off" ? false : null }} />;
}
