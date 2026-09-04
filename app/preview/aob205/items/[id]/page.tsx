import { notFound } from "next/navigation";
import { experienceFromParams, type SP } from "../../_variant";
import { ProjectShell } from "@/components/client-experience/ProjectShell";
import { brandStyle } from "@/lib/client-experience/layout";
import { ItemPanel } from "@/components/client-experience/ItemPanel";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const data = experienceFromParams(await searchParams);
  const item = data.items.find((i) => i.id === id);
  if (!item) notFound();
  return (
    <div className="ce" style={brandStyle(data)}>
      <ProjectShell data={data} section="items" backHref={`${data.basePath}/items`} />
      <main className="ce-page" style={{ maxWidth: 760 }}><ItemPanel item={item} basePath={data.basePath} linkSuffix={data.linkSuffix} allowed={{ twin: data.capabilities.twin }} /></main>
    </div>
  );
}
