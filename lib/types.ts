export interface Feature {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  route: string;
  cta: string;
  features?: string[];
  viewerPosition?: 'left' | 'right';
}

export type Tile = Feature;
