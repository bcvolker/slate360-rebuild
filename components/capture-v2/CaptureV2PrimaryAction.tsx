"use client";

import { Loader2 } from "lucide-react";
import {
  getPrimaryActionLabel,
  isPrimaryActionDisabled,
  type CaptureV2MachineState,
} from "./capture-v2-state-machine";

type Props = {
  state: CaptureV2MachineState;
  isDesktop: boolean;
  onAction: () => void;
  className?: string;
};

export function CaptureV2PrimaryAction({ state, isDesktop, onAction, className = "" }: Props) {
  if (state === "pending_upload_preview") return null;

  const disabled = isPrimaryActionDisabled(state);
  const label = getPrimaryActionLabel(state, isDesktop);
  const busy =
    state === "uploading" ||
    state === "upload_confirming" ||
    state === "saving_details" ||
    state === "advancing_stop" ||
    state === "opening_next_picker" ||
    state === "opening_picker";

  return (
    <button
      type="button"
      onClick={onAction}
      disabled={disabled}
      className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--graphite-primary)] px-5 py-3 text-base font-black text-[var(--graphite-canvas)] shadow-[0_0_22px_color-mix(in_srgb,var(--graphite-primary)_30%,transparent)] transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {busy && <Loader2 className="h-5 w-5 animate-spin" />}
      {label}
    </button>
  );
}
