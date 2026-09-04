import { notFound } from "next/navigation";
import { experienceFromParams, type SP } from "../_variant";
import { PlanExperience } from "@/components/client-experience/PlanExperience";
import { readString } from "@/lib/client-experience/utils";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const data = experienceFromParams(sp);
  if (!data.plan || !data.capabilities.plan) notFound();
  const u = readString(sp.u), v = readString(sp.v);
  return <PlanExperience data={data} initial={{ u: u ? Number(u) : null, v: v ? Number(v) : null, item: readString(sp.item), visitId: readString(sp.visit) }} />;
}
