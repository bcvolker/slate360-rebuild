import { redirectPublicPlan } from "@/lib/vnext/share/public-media";

export const runtime = "nodejs";

export function GET(_req: Request, ctx: { params: Promise<{ token: string; sheetId: string }> }) {
  return ctx.params.then(({ token, sheetId }) => redirectPublicPlan(token, sheetId));
}
