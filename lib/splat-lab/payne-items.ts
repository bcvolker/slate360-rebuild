export type PayneAction = "MOVE" | "STAY";
export type PayneKind = "table" | "fixture" | "whiteboard";

export type PayneItem = {
  id: string;
  action: PayneAction;
  kind: PayneKind;
  label: string;
  destination: string;
  fx: number;
  fy: number;
  photo: string | null;
  note: string;
  done: boolean;
};

export function moveItems(items: PayneItem[]): PayneItem[] {
  return items.filter((i) => i.action === "MOVE");
}

export function stayItems(items: PayneItem[]): PayneItem[] {
  return items.filter((i) => i.action === "STAY");
}
