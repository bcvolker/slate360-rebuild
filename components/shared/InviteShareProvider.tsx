"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface InviteShareContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const InviteShareContext = createContext<InviteShareContextValue | null>(null);

export function InviteShareProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <InviteShareContext.Provider value={value}>{children}</InviteShareContext.Provider>;
}

export function useInviteShare(): InviteShareContextValue {
  const ctx = useContext(InviteShareContext);
  if (!ctx) {
    throw new Error("useInviteShare must be used within an InviteShareProvider");
  }
  return ctx;
}
