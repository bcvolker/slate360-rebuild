import { existsSync } from "node:fs";
import { join } from "node:path";
import { PayneMoveShell } from "@/components/splat-lab/PayneMoveShell";

export const dynamic = "force-dynamic";

const PUBLIC_SPZ = "/preview/payne-213.spz";
const LOCAL_JOB = process.env.NEXT_PUBLIC_PAYNE_SPLAT_JOB?.trim() || "cecc2763";

function publicFile(rel: string): boolean {
  return existsSync(join(process.cwd(), "public", rel.replace(/^\//, "")));
}

function jobModel(id: string): string | null {
  if (process.env.VERCEL || !id) return null;
  const dir = join(process.cwd(), "tmp/splat-lab", id);
  if (existsSync(join(dir, "export", "output.spz")) || existsSync(join(dir, "output.spz"))) {
    return `/api/splat-lab/jobs/${id}/model`;
  }
  return null;
}

export default function Payne213Page() {
  const hosted = process.env.NEXT_PUBLIC_PAYNE_SPLAT_SRC?.trim();
  const splatSrc = hosted
    || (publicFile(PUBLIC_SPZ) ? PUBLIC_SPZ : jobModel(LOCAL_JOB));
  return <PayneMoveShell splatSrc={splatSrc} />;
}
