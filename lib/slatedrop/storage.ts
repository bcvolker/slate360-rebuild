export function resolveNamespace(orgId: string | null, userId: string): string {
  return orgId && orgId !== "default" ? orgId : userId;
}

export function buildCanonicalS3Key(namespace: string, folderId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._\-() ]/g, "_");
  return `orgs/${namespace}/${folderId}/${Date.now()}_${safeName}`;
}
