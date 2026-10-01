import { redirectPublicPreview } from "@/lib/vnext/share/public-media";

export const runtime = "nodejs";

export function GET(_req: Request, ctx: { params: Promise<{ token: string; modelId: string }> }) {
  return ctx.params.then(({ token, modelId }) => redirectPublicPreview(token, modelId));
}
