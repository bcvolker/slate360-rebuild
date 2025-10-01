export interface Feature {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  route: string;
  cta: string;
}

export interface Tile extends Feature {}
