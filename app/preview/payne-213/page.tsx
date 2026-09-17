import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PayneMoveShell } from "@/components/splat-lab/PayneMoveShell";
import type { PayneStill } from "@/components/splat-lab/PayneStillsStrip";
import type { PayneItem } from "@/lib/splat-lab/payne-items";

export const dynamic = "force-dynamic";

const PUBLIC_SPZ = "/preview/payne-213.spz";
const PUBLIC_GEO = "/preview/payne-213-lidar.spz";
const LOCAL_JOB = process.env.NEXT_PUBLIC_PAYNE_SPLAT_JOB?.trim() || "cecc2763";

type Pack = { items: PayneItem[]; plan: string };

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

async function loadPack(): Promise<Pack> {
  const raw = await readFile(join(process.cwd(), "public/preview/payne-213-items.json"), "utf8");
  return JSON.parse(raw) as Pack;
}

function loadStills(): { shown: PayneStill[]; count: number } {
  const p = join(process.cwd(), "public/preview/payne-213/stills.json");
  if (!existsSync(p)) return { shown: [], count: 0 };
  try {
    const data = JSON.parse(readFileSync(p, "utf8")) as { shown?: PayneStill[]; count?: number };
    return { shown: data.shown ?? [], count: data.count ?? 0 };
  } catch {
    return { shown: [], count: 0 };
  }
}

export default async function Payne213Page() {
  const pack = await loadPack();
  const hosted = process.env.NEXT_PUBLIC_PAYNE_SPLAT_SRC?.trim();
  const splatSrc = hosted
    || (publicFile(PUBLIC_SPZ) ? PUBLIC_SPZ : jobModel(LOCAL_JOB));
  const geometrySrc = process.env.NEXT_PUBLIC_PAYNE_LIDAR_SRC?.trim()
    || (publicFile("/preview/payne-213-phone.spz") ? "/preview/payne-213-phone.spz" : null)
    || (publicFile(PUBLIC_GEO) ? PUBLIC_GEO : null)
    || (publicFile("/preview/payne-213-lidar.ply") ? "/preview/payne-213-lidar.ply" : null);
  const stills = loadStills();
  return (
    <PayneMoveShell
      splatSrc={splatSrc}
      geometrySrc={geometrySrc}
      items={pack.items}
      planSrc={pack.plan}
      stills={stills.shown}
      stillsCaptured={stills.count}
    />
  );
}
