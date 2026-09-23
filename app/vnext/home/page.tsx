import { redirect } from "next/navigation";
import { POST_AUTH_RESOLVER, canonicalProductHome } from "@/lib/vnext/cutover";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Slate360" };

/** Persona split after login. Owners use the operations home. Clients use the portfolio. */
export default async function VnextHomePage() {
  const ctx = await requireVnextSession(POST_AUTH_RESOLVER);
  redirect(canonicalProductHome(ctx.canAccessOperationsConsole));
}
