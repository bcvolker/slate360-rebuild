import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { forbidden, unauthorized } from "@/lib/server/api-response";

export type ThermalOpsContext = {
  req: NextRequest;
  user: User;
  admin: ReturnType<typeof createAdminClient>;
  orgId: string | null;
};

export async function assertThermalOpsAccess(user: User): Promise<boolean> {
  // Thermal Studio is CEO-only — not general Operations Console staff.
  const ctx = await resolveServerOrgContext();
  if (ctx.user?.id !== user.id) return false;
  return ctx.isSlateCeo;
}

export async function withThermalOpsAuth(
  req: NextRequest,
  handler: (ctx: ThermalOpsContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return unauthorized();

    const allowed = await assertThermalOpsAccess(user);
    if (!allowed) return forbidden("Operations Console access required");

    const { admin, orgId } = await resolveProjectScope(user.id);
    return await handler({ req, user, admin, orgId });
  } catch (err) {
    console.error("[withThermalOpsAuth]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
