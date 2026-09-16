import { SplatLabWalkViewer } from "@/components/splat-lab/SplatLabWalkViewer";

export const dynamic = "force-dynamic";

const FIRST_JOB = "8fb02e4e";
const HQ_JOB = "91b7d4bd";
const LOCAL_SRC = `/api/splat-lab/jobs/${FIRST_JOB}/model`;
const PUBLIC_SRC = "/preview/backyard.spz";
const JOB_RE = /^[a-f0-9]{8}$/;

export default async function BackyardSplatPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job } = await searchParams;
  const hosted = process.env.NEXT_PUBLIC_BACKYARD_SPLAT_SRC?.trim();
  const local =
    job && JOB_RE.test(job) ? `/api/splat-lab/jobs/${job}/model` : LOCAL_SRC;
  const src = hosted || (process.env.VERCEL ? PUBLIC_SRC : local);
  const comparingHq = job === HQ_JOB;
  return (
    <SplatLabWalkViewer
      src={src}
      kicker="Backyard 360"
      title="Site record"
      note={
        comparingHq
          ? "HQ train (1280 px, densify 0.0002). Gaussian count did not grow — visual check only."
          : "First completed crop. HQ finished at the same gaussian count and looks softer, so it is not the published model."
      }
    />
  );
}
