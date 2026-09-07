import { experienceFromParams, type SP } from "../_variant";
import { ProjectShell } from "@/components/client-experience/ProjectShell";
import { brandStyle } from "@/lib/client-experience/layout";
import { DocumentsList } from "@/components/client-experience/ProjectLists";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const data = experienceFromParams(await searchParams);
  return (<div className="ce" style={brandStyle(data)}><ProjectShell data={data} section="documents" backHref={data.basePath} /><DocumentsList data={data} /></div>);
}
