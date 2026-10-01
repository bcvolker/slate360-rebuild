import type { NextRequest } from "next/server";
import { streamPublicTwinManifest } from "@/lib/vnext/share/public-media";

export const runtime = "nodejs";

export function GET(_req: NextRequest, ctx: { params: Promise<{ token: string; modelId: string }> }) {
  return ctx.params.then(({ token, modelId }) => streamPublicTwinManifest(token, modelId));
}
