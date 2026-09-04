import Link from "next/link";
import { ChevronLeft, Share2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ProjectExperience } from "@/lib/client-experience/types";
import { formatDate, latestVisit, visitById } from "@/lib/client-experience/utils";
import "./ce.css";

export type ShellSection = "overview" | "reality" | "plan" | "history" | "documents" | "items";

const NAV: { key: ShellSection; label: string; path: string }[] = [
  { key: "overview", label: "Overview", path: "" },
  { key: "reality", label: "Reality", path: "/reality" },
  { key: "plan", label: "Plan", path: "/plan" },
  { key: "history", label: "History", path: "/history" },
  { key: "documents", label: "Documents", path: "/documents" },
  { key: "items", label: "Items", path: "/items" },
];

type Props = {
  data: ProjectExperience;
  section: ShellSection;
  /** Immersive: the bar floats over a full-viewport viewer. */
  immersive?: boolean;
  /** Which visit the current view represents (for the date line). */
  visitId?: string | null;
  /** Where the back arrow goes; omitted on the overview. */
  backHref?: string;
  /** Right-side actions, rendered before Share. */
  actions?: ReactNode;
  /** Optional sub-label under the project name (e.g. "Walkthrough"). */
  viewLabel?: string;
};

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export function ProjectShell({ data, section, immersive = false, visitId, backHref, actions, viewLabel }: Props) {
  const visit = visitById(data, visitId) ?? latestVisit(data);
  const base = data.basePath;
  const meta = [viewLabel, formatDate(visit.capturedAt)].filter(Boolean).join(" · ");
  return (
    <header className={`ce-shell${immersive ? " ce-shell--immersive" : ""}`} data-testid="ce-shell">
      <div className="ce-identity">
        {backHref ? (
          <Link href={backHref} className="ce-identity__back" aria-label="Back">
            <ChevronLeft size={20} />
          </Link>
        ) : null}
        {data.brand.logoUrl ? (
          <img src={data.brand.logoUrl} alt={data.brand.name} className="ce-identity__logo" />
        ) : (
          <span className="ce-identity__mark" aria-hidden="true">{initials(data.brand.name)}</span>
        )}
        <div className="ce-identity__text">
          <div className="ce-identity__project">{data.project.name}</div>
          <div className="ce-identity__meta">{meta}</div>
        </div>
      </div>
      <nav className="ce-nav" aria-label="Project">
        {NAV.map((n) => (
          <Link key={n.key} href={`${base}${n.path}`} aria-current={n.key === section ? "page" : undefined}>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="ce-shell__actions">
        {actions}
        <button type="button" className="ce-btn ce-btn--sm" aria-label="Share this project">
          <Share2 size={14} /> <span className="ce-dock__desktop">Share</span>
        </button>
      </div>
    </header>
  );
}
