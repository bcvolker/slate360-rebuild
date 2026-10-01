/**
 * Client Documents are published project files.
 * Capture, reconstruction inputs, and operator commercial files stay out.
 * An unknown folder type is hidden.
 */

const CLIENT_FOLDER_TYPES = new Set([
  "drawings",
  "permits",
  "specs",
  "site_walk_plans",
  "site_walk_deliverables",
  "twin_deliverables",
  "tour_360_deliverables",
  "tour_360_plan_sheets",
  "reports",
  "records",
  "safety",
  "closeout",
  "submittals",
  "correspondence",
]);

/** Legacy rows that have a name but no folder_type. */
const CLIENT_FOLDER_NAMES = new Set([
  "drawings",
  "permits",
  "specs",
  "plans",
  "deliverables",
  "reports",
  "records",
  "safety",
  "closeout",
  "submittals",
  "correspondence",
  "plan sheets",
]);

export function folderDisplayLabel(name: string): string {
  const stripped = name.replace(/^\d+_/, "").replace(/_/g, " ").trim();
  return stripped || name.trim() || "Folder";
}

export function isClientDocumentFolder(folder: { folderType: string | null; name: string }): boolean {
  const type = folder.folderType?.trim() ?? "";
  if (type) return CLIENT_FOLDER_TYPES.has(type);
  return CLIENT_FOLDER_NAMES.has(folderDisplayLabel(folder.name).toLowerCase());
}
