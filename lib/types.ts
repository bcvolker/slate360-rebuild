import { LucideIcon } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
}

export interface Tile {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  cta: string;
  viewerPosition: "left" | "right";
}
