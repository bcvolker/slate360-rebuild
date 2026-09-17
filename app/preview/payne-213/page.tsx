import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PayneMoveShell } from "@/components/splat-lab/PayneMoveShell";
import type { PayneItem } from "@/lib/splat-lab/payne-items";

export const dynamic = "force-dynamic";

const PUBLIC_SPZ = "/preview/payne-213.spz";
const LOCAL_JOB = process.env.NEXT_PUBLIC_PAYNE_SPLAT_JOB?.trim();

type Pack = { items: PayneItem[]; plan: string };

async function loadPack(): Promise<Pack> {
  const raw = await readFile(join(process.cwd(), "public/preview/payne-213-items.json"), "utf8");
  const data = JSON.parse(raw) as { items: PayneItem[]; plan: string };
  return { items: data.items, plan: data.plan };
}

export default async function Payne213Page() {
  const pack = await loadPack();
  const hosted = process.env.NEXT_PUBLIC_PAYNE_SPLAT_SRC?.trim();
  const hasSpz = existsSync(join(process.cwd(), "public/preview/payne-213.spz"));
  const splatSrc = hosted
    || (hasSpz ? PUBLIC_SPZ : (!process.env.VERCEL && LOCAL_JOB
      ? `/api/splat-lab/jobs/${LOCAL_JOB}/model`
      : null));
  return <PayneMoveShell splatSrc={splatSrc} items={pack.items} planSrc={pack.plan} />;
}
