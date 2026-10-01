export const LIBRARY_KINDS = [
  { id: "all", label: "All", href: "/library" },
  { id: "walkthrough", label: "Walkthroughs", href: "/library?kind=walkthrough" },
  { id: "twin", label: "Digital Twins", href: "/library?kind=twin" },
  { id: "site-walk", label: "Site Walks", href: "/library?kind=site-walk" },
  { id: "thermal", label: "Thermal", href: "/library?kind=thermal" },
  { id: "tour", label: "360 Tours", href: "/library?kind=tour" },
] as const;

export type LibraryKind = (typeof LIBRARY_KINDS)[number]["id"];

export function parseLibraryKind(value: string | null | undefined): LibraryKind {
  return LIBRARY_KINDS.some((k) => k.id === value) ? (value as LibraryKind) : "all";
}

export function libraryKindHref(kind: LibraryKind): string {
  return LIBRARY_KINDS.find((k) => k.id === kind)?.href ?? "/library";
}

export function projectWalkthroughFilterHref(projectId: string): string {
  return `/projects/${projectId}/walkthroughs`;
}
