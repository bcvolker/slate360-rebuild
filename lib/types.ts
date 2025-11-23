export interface TileBullet {
  label: string;
  description?: string;
}

export interface TileCta {
  label: string;
  href: string;
}

export interface TileViewer {
  title: string;
  subtitle?: string;
  badge?: string;
  mediaType?: "video" | "model" | "360" | "image" | "placeholder";
}

export interface TileTheme {
  accent?: string;
  surface?: string;
  text?: string;
}

export interface TileLayout {
  align?: "left" | "right";
  snap?: boolean;
}

export interface Tile {
  id: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  bullets: TileBullet[];
  cta?: TileCta;
  secondaryCta?: TileCta;
  viewer?: TileViewer;
  layout?: TileLayout;
  theme?: TileTheme;
}
