import { experienceFor } from "@/lib/client-experience/aob205-variants";
import { readString } from "@/lib/client-experience/utils";

export type SP = Record<string, string | string[] | undefined>;

/** Resolve the preview variant (?state=A..E&brand=slate|client|whitelabel) for a page. */
export function experienceFromParams(sp: SP) {
  return experienceFor({ state: readString(sp.state), brand: readString(sp.brand) });
}
