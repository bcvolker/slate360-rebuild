import type { CaptureItemDraft } from "@/lib/types/site-walk-capture";

export type CaptureV2DrawerChip = {
  label: string;
  apply: (draft: CaptureItemDraft) => Partial<CaptureItemDraft>;
};

function appendNote(notes: string, snippet: string): string {
  const trimmed = notes.trim();
  if (!trimmed) return snippet;
  if (trimmed.toLowerCase().includes(snippet.toLowerCase())) return trimmed;
  return `${trimmed}\n${snippet}`;
}

function mergeTags(tags: string[], next: string): string[] {
  const value = next.trim();
  if (!value) return tags;
  return Array.from(new Set([...tags, value]));
}

export const CAPTURE_V2_DRAWER_CHIPS: CaptureV2DrawerChip[] = [
  {
    label: "Safety",
    apply: (draft) => ({
      classification: "Safety",
      notes: appendNote(draft.notes, "Safety item noted on site."),
    }),
  },
  {
    label: "Progress",
    apply: (draft) => ({
      classification: "Progress",
      notes: appendNote(draft.notes, "Progress update captured."),
    }),
  },
  {
    label: "Issue",
    apply: (draft) => ({
      priority: "high",
      status: "open",
      notes: appendNote(draft.notes, "Issue identified during walk."),
    }),
  },
  {
    label: "Completed",
    apply: () => ({
      status: "resolved",
    }),
  },
  {
    label: "Needs Review",
    apply: (draft) => ({
      status: "in_progress",
      notes: appendNote(draft.notes, "Needs review before closeout."),
    }),
  },
  {
    label: "Electrical",
    apply: (draft) => ({
      trade: "Electrical",
      tags: mergeTags(draft.tags, "Electrical"),
    }),
  },
  {
    label: "Mechanical",
    apply: (draft) => ({
      tags: mergeTags(draft.tags, "Mechanical"),
      trade: draft.trade || "HVAC",
    }),
  },
  {
    label: "Drywall",
    apply: (draft) => ({
      trade: "Drywall",
      tags: mergeTags(draft.tags, "Drywall"),
    }),
  },
];
