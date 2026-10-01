"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => {
    if (node.getAttribute("aria-hidden") === "true") return false;
    return node.getClientRects().length > 0;
  });
}

type UseVnextDialogOptions = {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function useVnextDialog({
  open,
  onClose,
  panelRef,
  returnFocusRef,
}: UseVnextDialogOptions) {
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    panel.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = visibleFocusable(panel);
      if (nodes.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      const restore = returnFocusRef?.current ?? previous;
      restore?.focus();
    };
  }, [open, onClose, panelRef, returnFocusRef]);
}
