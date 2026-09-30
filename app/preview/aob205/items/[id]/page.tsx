import { notFound } from "next/navigation";
import { aob205Experience as data } from "@/lib/client-experience/aob205-fixture";
import { ProjectShell } from "@/components/client-experience/ProjectShell";
import { ItemPanel } from "@/components/client-experience/ItemPanel";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = data.items.find((i) => i.id === id);
  if (!item) notFound();
  return (
    <>
      <ProjectShell data={data} section="items" backHref={`${data.basePath}/items`} />
      <main className="ce-page" style={{ maxWidth: 760 }}><ItemPanel item={item} basePath={data.basePath} /></main>
    </>
  );
}
