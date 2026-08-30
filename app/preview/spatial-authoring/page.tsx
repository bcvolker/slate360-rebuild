import { readFile } from "node:fs/promises";
import path from "node:path";
import { AuthoringPreviewClient } from "@/components/spatial-walkthrough/studio/AuthoringPreviewClient";

export const metadata = { title: "Spatial Walkthrough authoring" };
export const dynamic = "force-dynamic";

async function loadShareToken(): Promise<string> {
  if (process.env.SPATIAL_SHARE_TOKEN) return process.env.SPATIAL_SHARE_TOKEN;
  try {
    const raw = await readFile(path.join(process.cwd(), ".spatial-rc1-share.json"), "utf8");
    const parsed = JSON.parse(raw) as { token?: string };
    return typeof parsed.token === "string" ? parsed.token : "";
  } catch {
    return "";
  }
}

export default async function SpatialAuthoringPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string }>;
}) {
  const token = await loadShareToken();
  const { scene = "timeline" } = await searchParams;
  if (!token) {
    return (
      <p className="p-6 text-sm text-[var(--graphite-muted)]">
        HouseWalk share token missing. Add .spatial-rc1-share.json or SPATIAL_SHARE_TOKEN. Grid fixtures are not used.
      </p>
    );
  }
  return <AuthoringPreviewClient token={token} scene={scene} />;
}
