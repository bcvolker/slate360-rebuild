"use client";

import Link from "next/link";
import { Plus, Search, Upload, Share2 } from "lucide-react";
import { useInviteShare } from "@/components/shared/InviteShareProvider";
import { cn } from "@/lib/utils";

type QuickAction =
  | { kind: "link"; label: string; icon: typeof Plus; href: string }
  | { kind: "button"; label: string; icon: typeof Plus; onClick: () => void };

const CARD_CLASS =
  "flex min-h-[100px] flex-col items-center justify-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.04] px-3 text-zinc-300 transition-colors hover:border-amber-500/25 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]";
const ICON_CLASS = "size-7 text-amber-500";
const LABEL_CLASS = "text-[14px] font-medium leading-tight text-center";

function dispatchCommandPalette() {
  if (typeof window === "undefined") return;
  // Triggers the global ⌘K listener registered in AppShell — the canonical
  // way to open CommandPalette from any surface without coupling to its internals.
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
  );
}

export function DashboardV2QuickActions() {
  const { setOpen: openInviteShare } = useInviteShare();

  const actions: QuickAction[] = [
    {
      kind: "link",
      label: "New Worksite",
      icon: Plus,
      // "Create Project" label deferred — no safe entitlement gate for
      // PM-tier vs field-only users yet (canAccessHub is true for all tiers).
      // Revisit when a canCreateProject flag or tier gate is added.
      href: "/site-walk/setup",
    },
    {
      kind: "button",
      label: "Search",
      icon: Search,
      onClick: dispatchCommandPalette,
    },
    {
      kind: "link",
      label: "Upload Files",
      icon: Upload,
      // Routes to full SlateDrop file system — not a generic upload modal.
      // SlateDrop is the shared file/folder backbone for the platform.
      href: "/slatedrop",
    },
    {
      kind: "button",
      label: "Invite & Share",
      icon: Share2,
      onClick: () => openInviteShare(true),
    },
  ];

  return (
    <section aria-label="Quick Actions">
      <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.24em] text-amber-400/90">
        Quick Actions
      </p>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          if (action.kind === "link") {
            return (
              <Link key={action.label} href={action.href} className={CARD_CLASS}>
                <Icon className={ICON_CLASS} />
                <span className={LABEL_CLASS}>{action.label}</span>
              </Link>
            );
          }
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn(CARD_CLASS, "w-full")}
            >
              <Icon className={ICON_CLASS} />
              <span className={LABEL_CLASS}>{action.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
