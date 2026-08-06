import { notFound } from "next/navigation";
import { TwinStudioShell } from "@/components/twin-studio/TwinStudioShell";
import { loadTwinStudioSpace } from "@/lib/digital-twin/load-twin-studio-data";
import { resolveServerOrgContext } from "@/lib/server/org-context";

type PageProps = { params: Promise<{ spaceId: string }> };

export default async function TwinStudioSpacePage({ params }: PageProps) {
  const { spaceId } = await params;
  const { orgId } = await resolveServerOrgContext();
  const space = await loadTwinStudioSpace(spaceId, orgId);
  if (!space) notFound();

  return (
    <div className="h-full min-h-0 p-3">
      <TwinStudioShell space={space} />
    </div>
  );
}
