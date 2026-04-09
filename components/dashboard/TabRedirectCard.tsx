import Link from "next/link";
import type { DashTab } from "@/lib/types/dashboard";

const REDIRECT_ROUTES: Record<string, { href: string; hoverColor?: string }> = {
  "project-hub":    { href: "/project-hub",    hoverColor: "#E64500" },
  "integrations":   { href: "/integrations",   hoverColor: "#E04400" },
  "analytics":      { href: "/analytics",      hoverColor: "#E04400" },
  "ceo":            { href: "/ceo",           hoverColor: "#E64500" },
  "design-studio":  { href: "/design-studio" },
  "content-studio": { href: "/content-studio" },
  "tours":          { href: "/tours" },
  "geospatial":     { href: "/geospatial" },
  "virtual-studio": { href: "/virtual-studio" },
};

export function hasRedirectRoute(tabId: string): boolean {
  return tabId in REDIRECT_ROUTES;
}

export default function TabRedirectCard({ tab }: { tab: DashTab }) {
  const route = REDIRECT_ROUTES[tab.id];
  if (!route) return null;

  const bgColor = route.hoverColor ? "#D4AF37" : tab.color;
  const hoverStyle = route.hoverColor
    ? `hover:bg-[${route.hoverColor}]`
    : "hover:opacity-90";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h3 className="text-base font-bold text-white">Open {tab.label}</h3>
      <p className="mt-1 text-sm text-zinc-400">{tab.label} now runs in its dedicated workspace route.</p>
      <Link
        href={route.href}
        className={`mt-4 inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-white ${hoverStyle}`}
        style={{ backgroundColor: bgColor }}
      >
        Go to {tab.label}
      </Link>
    </div>
  );
}
