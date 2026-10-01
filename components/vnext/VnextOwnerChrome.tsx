"use client";

import { useCallback, useRef, type ReactNode, type RefObject } from "react";
import { VnextNavLink } from "@/components/vnext/VnextNavLink";
import { useVnextDialog } from "@/components/vnext/useVnextDialog";
import { VNEXT_OWNER_FIELD_TOOLS, VNEXT_OWNER_PRIMARY_NAV, VNEXT_OWNER_SECONDARY_NAV } from "@/lib/vnext/nav";

type VnextOwnerMenuProps = {
  pathname: string;
  onNavigate?: () => void;
};

export function VnextOwnerNavLists({ pathname, onNavigate }: VnextOwnerMenuProps) {
  return (
    <>
      <p className="m-0 px-3 pt-3 pb-1 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
        Work
      </p>
      <nav aria-label="Owner" className="flex flex-col">
        {VNEXT_OWNER_PRIMARY_NAV.map((item) => (
          <VnextNavLink
            key={item.href}
            item={item}
            pathname={pathname}
            variant="sidebar"
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="mx-3 mt-4 border-t border-[var(--vnext-line)]" />
      <p className="m-0 px-3 pt-3 pb-1 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
        Field tools
      </p>
      <nav aria-label="Field tools" className="flex flex-col">
        {VNEXT_OWNER_FIELD_TOOLS.map((item) => (
          <VnextNavLink
            key={item.href}
            item={item}
            pathname={pathname}
            variant="sidebar"
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="mx-3 mt-4 border-t border-[var(--vnext-line)]" />
      <nav aria-label="Owner account" className="mt-2 flex flex-col">
        {VNEXT_OWNER_SECONDARY_NAV.map((item) => (
          <VnextNavLink
            key={item.href}
            item={item}
            pathname={pathname}
            variant="sidebar"
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </>
  );
}

export function VnextOwnerDrawer({
  open,
  pathname,
  onClose,
  titleId,
  dialogId,
  returnFocusRef,
}: {
  open: boolean;
  pathname: string;
  onClose: () => void;
  titleId: string;
  dialogId: string;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useVnextDialog({ open, onClose: close, panelRef, returnFocusRef });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--vnext-ink)_32%,transparent)]"
        aria-hidden="true"
        data-vnext-drawer-backdrop="true"
        onClick={close}
      />
      <div
        ref={panelRef}
        id={dialogId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-[min(20rem,calc(100%-2rem))] flex-col border-l border-[var(--vnext-line)] bg-[var(--vnext-surface)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[var(--vnext-shadow)] outline-none"
      >
        <div className="flex min-h-[var(--vnext-header-h)] items-center justify-between gap-3 border-b border-[var(--vnext-line)] px-3">
          <h2 id={titleId} className="m-0 text-[length:var(--vnext-nav)] font-semibold">
            Menu
          </h2>
          <button
            type="button"
            onClick={close}
            className="inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center px-3 text-[length:var(--vnext-nav)] text-[var(--vnext-ink-secondary)]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <VnextOwnerNavLists pathname={pathname} onNavigate={close} />
        </div>
      </div>
    </div>
  );
}

export function VnextOwnerSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden w-[var(--vnext-sidebar-w)] shrink-0 flex-col border-r border-[var(--vnext-line)] bg-[var(--vnext-surface)] lg:flex">
      <VnextOwnerNavLists pathname={pathname} />
    </aside>
  );
}

export function VnextOwnerChrome({
  header,
  sidebar,
  drawer,
  children,
  lockBackground = false,
}: {
  header: ReactNode;
  sidebar: ReactNode;
  drawer: ReactNode;
  children: ReactNode;
  lockBackground?: boolean;
}) {
  return (
    <div
      data-vnext-shell="owner"
      className="relative flex min-h-[100dvh] min-w-0 flex-col bg-[var(--vnext-canvas)]"
    >
      <div
        className="flex min-h-[100dvh] min-w-0 flex-1 flex-col lg:flex-row"
        {...(lockBackground ? { inert: true } : {})}
      >
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          {header}
          <main className="min-w-0 flex-1 pb-[env(safe-area-inset-bottom)]">{children}</main>
        </div>
      </div>
      {drawer}
    </div>
  );
}
