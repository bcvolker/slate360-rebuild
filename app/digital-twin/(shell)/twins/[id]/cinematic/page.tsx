import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { canAccessTwinDesktop } from "@/lib/digital-twin/desktop-access";
import { loadCinematicEditorData } from "@/lib/digital-twin/load-cinematic-editor";
import { CinematicCameraPath } from "@/components/digital-twin/desktop/CinematicCameraPath";

type Props = { params: Promise<{ id: string }> };

export default async function TwinCinematicPage({ params }: Props) {
  const { id: spaceId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!(await canAccessTwinDesktop(ctx))) notFound();

  const data = await loadCinematicEditorData(spaceId, ctx.orgId);
  if (!data) notFound();

  return (
    <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:flex">
      <CinematicCameraPath
        spaceId={data.spaceId}
        spaceTitle={data.spaceTitle}
        modelId={data.modelId}
        modelTitle={data.modelTitle}
        modelUrl={data.modelUrl}
        initialPath={data.cameraPath}
      />
    </div>
  );
}
