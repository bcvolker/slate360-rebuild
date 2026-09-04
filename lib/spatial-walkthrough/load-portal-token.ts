import { loadShareRow, shareDenied } from "./share-resolve";
import { loadClientPortalLanding } from "./client-portal-load";

export async function loadPortalByToken(token: string) {
  const walk = await loadShareRow(token);
  if (!walk.row || shareDenied(walk.row)) return null;
  return loadClientPortalLanding({
    orgId: walk.row.org_id,
    walkthroughId: walk.row.walkthrough_id,
    token,
  });
}
