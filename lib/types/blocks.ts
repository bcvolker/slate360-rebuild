export type BlockType = "heading" | "text" | "image" | "divider" | "callout";

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  content: string;
  level: 1 | 2 | 3;
}

export interface TextBlock extends BaseBlock {
  type: "text";
  content: string;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  src: string;
  alt: string;
  caption: string;
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  content: string;
  variant: "info" | "warning" | "success";
}

export type EditorBlock =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | DividerBlock
  | CalloutBlock;

export function createBlock(type: BlockType): EditorBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "heading":
      return { id, type: "heading", content: "", level: 2 };
    case "text":
      return { id, type: "text", content: "" };
    case "image":
      return { id, type: "image", src: "", alt: "", caption: "" };
    case "divider":
      return { id, type: "divider" };
    case "callout":
      return { id, type: "callout", content: "", variant: "info" };
  }
}
