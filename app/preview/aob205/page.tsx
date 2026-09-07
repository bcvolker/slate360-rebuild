import { experienceFromParams, type SP } from "./_variant";
import { ProjectShell } from "@/components/client-experience/ProjectShell";
import { brandStyle } from "@/lib/client-experience/layout";
import { ProjectOverview } from "@/components/client-experience/ProjectOverview";

export default async function Aob205OverviewPage({ searchParams }: { searchParams: Promise<SP> }) {
  const data = experienceFromParams(await searchParams);
  return (<div className="ce" style={brandStyle(data)}><ProjectShell data={data} section="overview" /><ProjectOverview data={data} /></div>);
}
