import type { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

const Schema = z.object({
  skipInstall: z.boolean().optional(),
  next: z.string().max(200).optional(),
});

type ProfileUpdate = {
  onboarding_completed_at?: string;
  onboarding_skipped_install?: boolean;
};

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user, admin }) => {
    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const update: ProfileUpdate = {};
    if (parsed.data.skipInstall) {
      update.onboarding_skipped_install = true;
    } else {
      update.onboarding_completed_at = new Date().toISOString();
    }

    const { error } = await admin
      .from("profiles")
      .update(update)
      .eq("id", user.id);

    if (error) return serverError(error.message);
    return ok({ ok: true, next: parsed.data.next ?? null });
  });
}
