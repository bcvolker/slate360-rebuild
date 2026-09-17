import { SplatLabWalkViewer } from "@/components/splat-lab/SplatLabWalkViewer";

export const dynamic = "force-dynamic";

const LOCAL_SRC = "/api/splat-lab/jobs/8fb02e4e/model?crop=yard2";
const PUBLIC_SRC = "/preview/backyard.spz";

export default function BackyardSplatPreviewPage() {
  const hosted = process.env.NEXT_PUBLIC_BACKYARD_SPLAT_SRC?.trim();
  const src = hosted || (process.env.VERCEL ? PUBLIC_SRC : LOCAL_SRC);
  return (
    <SplatLabWalkViewer
      src={src}
      kicker="Backyard 360"
      title="Site record"
      note="You are looking at the first build. A sharper model is still training and will replace this when it finishes."
    />
  );
}
