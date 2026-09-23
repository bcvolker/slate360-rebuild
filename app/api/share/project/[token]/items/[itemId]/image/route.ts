import { redirectPublicPano } from "@/lib/vnext/share/public-media";

export const runtime = "nodejs";

export function GET(_req: Request, ctx: { params: Promise<{ token: string; itemId: string }> }) {
  return ctx.params.then(({ token, itemId }) => redirectPublicPano(token, itemId));
}
