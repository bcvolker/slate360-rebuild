"use server";

import { isOwnerEmail } from "@/lib/server/beta-access";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_POST_LOGIN_PATH,
  isSafeInternalPath,
  resolvePostLoginPath,
} from "@/lib/auth/post-login-path";

/**
 * Server-side landing after a client password sign-in.
 * `CEO_EMAIL` never ships to the browser; the client asks for a path only.
 * If the session cookie is not visible yet, fall back to the requested path
 * so a non-CEO user still reaches `/app`.
 */
export async function resolveAuthenticatedLanding(requestedPath: string | null): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const requested = requestedPath?.trim() ?? "";
    return requested && isSafeInternalPath(requested) ? requested : DEFAULT_POST_LOGIN_PATH;
  }

  return resolvePostLoginPath({
    isCeo: isOwnerEmail(user.email),
    requestedPath,
  });
}
