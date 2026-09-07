"use client";

import Link from "next/link";
import { ChevronLeft, MoreHorizontal, Share2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProjectExperience } from "@/lib/client-experience/types";
import { formatDate, latestVisit, visitById } from "@/lib/client-experience/utils";
import { navFor, type NavKey } from "@/lib/client-experience/layout";
import { BrandSlot } from "./BrandSlot";
import "./ce.css";

const NAV_LABEL: Record<NavKey, string> = { overview: "Overview", reality: "Reality", plan: "Plan", history: "History", documents: "Documents", items: "Items" };
const NAV_PATH: Record<NavKey, string> = { overview: "", reality: "/reality", plan: "/plan", history: "/history", documents: "/documents", items: "/items" };

type Props = {
  data: ProjectExperience;
  section: NavKey;
  immersive?: boolean;
  visitId?: string | null;
  backHref?: string;
  actions?: ReactNode;
  viewLabel?: string;
  /** Extra entries for the More menu (e.g. Tools inside a viewer). */
  more?: { label: string; onSelect: () => void; icon?: ReactNode }[];
  onShare?: () => void;
};

export function ProjectShell({ data, section, immersive = false, visitId, backHref, actions, viewLabel, more = [], onShare }: Props) {
  const visit = visitById(data, visitId) ?? latestVisit(data);
  const base = data.basePath, q = data.linkSuffix ?? "";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const share = () => { setOpen(false); onShare ? onShare() : void navigator.clipboard?.writeText(window.location.href); };

  return (
    <header className={`ce-shell${immersive ? " ce-shell--immersive" : ""}`} data-testid="ce-shell">
      <div className="ce-identity">
        {backHref ? <Link href={`${backHref}${q}`} className="ce-identity__back" aria-label="Back to project"><ChevronLeft size={20} /></Link> : null}
        <BrandSlot brand={data.brand} compact={immersive} />
        <div className="ce-identity__text">
          <div className="ce-identity__project">{data.project.name}</div>
          <div className="ce-identity__meta">
            {viewLabel ? <span>{viewLabel}</span> : null}
            <span className="ce-code">{formatDate(visit.capturedAt)}</span>
          </div>
        </div>
      </div>
      <nav className="ce-nav" aria-label="Project">
        {navFor(data).map((k) => (
          <Link key={k} href={`${base}${NAV_PATH[k]}${q}`} aria-current={k === section ? "page" : undefined}>{NAV_LABEL[k]}</Link>
        ))}
      </nav>
      <div className="ce-shell__actions" ref={menuRef}>
        {actions}
        <button type="button" className="ce-btn ce-btn--sm ce-dock__desktop" onClick={share} aria-label="Share this project"><Share2 size={14} /> Share</button>
        <button type="button" className="ce-btn ce-btn--sm ce-btn--icon" aria-label="More" aria-expanded={open} onClick={() => setOpen((v) => !v)}><MoreHorizontal size={16} /></button>
        {open ? (
          <div className="ce-menu" role="menu">
            <button type="button" role="menuitem" className="ce-menu__item ce-dock__mobile" onClick={share}><Share2 size={15} /> Share</button>
            {more.map((m) => (
              <button key={m.label} type="button" role="menuitem" className="ce-menu__item" onClick={() => { setOpen(false); m.onSelect(); }}>{m.icon}{m.label}</button>
            ))}
            {navFor(data).map((k) => (
              <Link key={k} href={`${base}${NAV_PATH[k]}${q}`} role="menuitem" className="ce-menu__item ce-dock__mobile" onClick={() => setOpen(false)}>{NAV_LABEL[k]}</Link>
            ))}
            {data.brand.poweredBySlate360 ? <div className="ce-menu__foot">Powered by Slate360</div> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
