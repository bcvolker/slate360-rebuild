import { redirect } from "next/navigation";
import { POST_AUTH_RESOLVER, personaDefaultHome } from "@/lib/vnext/cutover";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

export const metadata = { title: "Slate360" };

/** Persona split after login. Owners use operations. Staff use the field shell. Clients use the portfolio. */
export default async function VnextHomePage() {
  const ctx = await requireVnextSession(POST_AUTH_RESOLVER);
  redirect(personaDefaultHome({
    canAccessOperationsConsole: ctx.canAccessOperationsConsole,
    isInternalUser: ctx.hasInternalAccess,
  }));
}
