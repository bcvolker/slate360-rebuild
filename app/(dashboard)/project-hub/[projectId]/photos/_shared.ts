/* Photo page shared types, constants & helpers */

export type PhotoFile = {
  id: string;
  name: string;
  type?: string;
  modified?: string;
};

export type ViewMode = "grid" | "masonry" | "list";
export type SortBy = "name" | "date" | "type";

export const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "svg", "tiff", "tif"];

export function isImage(file: PhotoFile): boolean {
  const ext = String(file.type ?? "").toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return true;
  const nameExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.includes(nameExt);
}

export function getExtension(file: PhotoFile): string {
  return (file.name.split(".").pop() ?? "").toUpperCase();
}

export function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/exterior|outside|facade|elevation/i.test(n)) return "Exterior";
  if (/interior|inside|room|office|lobby/i.test(n)) return "Interior";
  if (/aerial|drone|bird/i.test(n)) return "Aerial";
  if (/progress|update|wip/i.test(n)) return "Progress";
  if (/safety|ppe|hard.?hat/i.test(n)) return "Safety";
  if (/finish|complete|final/i.test(n)) return "Closeout";
  return "General";
}
