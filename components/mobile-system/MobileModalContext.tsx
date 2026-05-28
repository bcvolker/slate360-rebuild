"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MobileModalContextValue = {
  feedbackOpen: boolean;
  qrOpen: boolean;
  openFeedback: () => void;
  closeFeedback: () => void;
  openQr: () => void;
  closeQr: () => void;
  toggleQr: () => void;
};

const MobileModalContext = createContext<MobileModalContextValue | null>(null);

export function MobileModalProvider({ children }: { children: ReactNode }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const openFeedback = useCallback(() => setFeedbackOpen(true), []);
  const closeFeedback = useCallback(() => setFeedbackOpen(false), []);
  const openQr = useCallback(() => setQrOpen(true), []);
  const closeQr = useCallback(() => setQrOpen(false), []);
  const toggleQr = useCallback(() => setQrOpen((open) => !open), []);

  const value = useMemo(
    () => ({
      feedbackOpen,
      qrOpen,
      openFeedback,
      closeFeedback,
      openQr,
      closeQr,
      toggleQr,
    }),
    [feedbackOpen, qrOpen, openFeedback, closeFeedback, openQr, closeQr, toggleQr],
  );

  return <MobileModalContext.Provider value={value}>{children}</MobileModalContext.Provider>;
}

export function useMobileModal(): MobileModalContextValue {
  const ctx = useContext(MobileModalContext);
  if (!ctx) {
    throw new Error("useMobileModal must be used within a MobileModalProvider");
  }
  return ctx;
}
