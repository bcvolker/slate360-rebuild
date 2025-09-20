export interface Tile {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  cta: string;
  viewerPosition: 'left' | 'right';
  theme: 'light' | 'dark';
  media?: {
    src: string;
    alt: string;
  };
}
