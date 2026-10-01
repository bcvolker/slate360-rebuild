import { LibraryHub } from "@/components/product-shell/LibraryHub";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveSpatialAccess } from "@/lib/spatial-walkthrough/access";

export const metadata = { title: "Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ kind?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const { orgId, isSlateCeo, isAdmin } = await resolveServerOrgContext();
  const access = await resolveSpatialAccess(orgId, Boolean(isSlateCeo), Boolean(isAdmin));
  return <LibraryHub kind={params.kind} canAuthor={access.canAuthor} />;
}
