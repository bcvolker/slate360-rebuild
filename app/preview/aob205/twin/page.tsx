import { notFound } from "next/navigation";
import { experienceFromParams, type SP } from "../_variant";
import { TwinExperience } from "@/components/client-experience/TwinExperience";
import { readString } from "@/lib/client-experience/utils";

/** Only an accepted (here: explicitly simulated) twin renders. The real AOB205 candidate is never reachable. */
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const data = experienceFromParams(sp);
  if (!data.twin || !data.capabilities.twin) notFound();
  const panel = readString(sp.panel) as "plan" | "items" | "mode" | "more" | null;
  return <TwinExperience data={data} initial={{ item: readString(sp.item), panel }} />;
}
