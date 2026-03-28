export type FolderRow = { id: string; name: string };
export type DrawingFile = { id: string; name: string; type?: string; modified?: string };
export type ViewMode = "grid" | "list";

export const DRAWING_SETS = ["All Sets", "Architectural", "Structural", "Mechanical", "Electrical", "Plumbing", "Civil", "Landscape", "Fire Protection"] as const;

export function isPdf(file: DrawingFile): boolean {
  const ext = String(file.type ?? "").toLowerCase();
  return ext === "pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function guessSet(name: string): string {
  const n = name.toLowerCase();
  if (/^a[\d-]|architect/i.test(n)) return "Architectural";
  if (/^s[\d-]|structur/i.test(n)) return "Structural";
  if (/^m[\d-]|mechanic/i.test(n)) return "Mechanical";
  if (/^e[\d-]|electric/i.test(n)) return "Electrical";
  if (/^p[\d-]|plumb/i.test(n)) return "Plumbing";
  if (/^c[\d-]|civil/i.test(n)) return "Civil";
  if (/^l[\d-]|landscape/i.test(n)) return "Landscape";
  if (/^fp[\d-]|fire/i.test(n)) return "Fire Protection";
  return "Architectural";
}
