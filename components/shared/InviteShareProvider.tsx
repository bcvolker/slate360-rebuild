"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { InviteShareData } from "@/lib/types/invite";

interface InviteShareContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const InviteShareContext = createContext<InviteShareContextValue | null>(null);
const InviteShareDataContext = createContext<InviteShareData | null>(null);

type InviteShareProviderProps = {
  children: ReactNode;
  inviteShareData?: InviteShareData;
};

export function InviteShareProvider({ children, inviteShareData }: InviteShareProviderProps) {
  const [open, setOpen] = useState(false);
  const modalValue = useMemo(() => ({ open, setOpen }), [open]);
  return (
    <InviteShareDataContext.Provider value={inviteShareData ?? null}>
      <InviteShareContext.Provider value={modalValue}>{children}</InviteShareContext.Provider>
    </InviteShareDataContext.Provider>
  );
}

export function useInviteShare(): InviteShareContextValue {
  const ctx = useContext(InviteShareContext);
  if (!ctx) {
    throw new Error("useInviteShare must be used within an InviteShareProvider");
  }
  return ctx;
}

export function useInviteShareData(): InviteShareData | null {
  return useContext(InviteShareDataContext);
}
