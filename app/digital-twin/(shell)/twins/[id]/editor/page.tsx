import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { canAccessTwinDesktop } from "@/lib/digital-twin/desktop-access";
import { loadDesktopEditorData } from "@/lib/digital-twin/load-desktop-editor";
import { DesktopSplatEditor } from "@/components/digital-twin/desktop/DesktopSplatEditor";

type Props = { params: Promise<{ id: string }> };

export default async function TwinDesktopEditorPage({ params }: Props) {
  const { id: spaceId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!(await canAccessTwinDesktop(ctx))) notFound();

  const data = await loadDesktopEditorData(spaceId, ctx.orgId);
  if (!data) notFound();

  return (
    <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:flex">
      <DesktopSplatEditor
        spaceId={data.spaceId}
        spaceTitle={data.spaceTitle}
        modelId={data.modelId}
        modelTitle={data.modelTitle}
        modelUrl={data.modelUrl}
        initialEditList={data.editList}
      />
    </div>
  );
}
