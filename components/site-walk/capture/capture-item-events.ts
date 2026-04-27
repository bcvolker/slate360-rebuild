"use client";

import { useEffect } from "react";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

const CAPTURE_ITEM_FOCUS_EVENT = "site-walk-capture-item-focus";

type CaptureItemFocusDetail = {
  item: CaptureItemRecord;
  reason: "captured" | "pin" | "selected";
};

function isCaptureItem(value: unknown): value is CaptureItemRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.session_id === "string";
}

function isFocusDetail(value: unknown): value is CaptureItemFocusDetail {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return isCaptureItem(record.item) && (record.reason === "captured" || record.reason === "pin" || record.reason === "selected");
}

export function publishCaptureItemFocus(detail: CaptureItemFocusDetail) {
  window.dispatchEvent(new CustomEvent(CAPTURE_ITEM_FOCUS_EVENT, { detail }));
}

export function useCaptureItemFocus(handler: (detail: CaptureItemFocusDetail) => void) {
  useEffect(() => {
    function onFocus(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      if (isFocusDetail(detail)) handler(detail);
    }

    window.addEventListener(CAPTURE_ITEM_FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(CAPTURE_ITEM_FOCUS_EVENT, onFocus);
  }, [handler]);
}
