"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ClientSurfaceFlags } from "@/lib/spatial-walkthrough/client-surface";

const ClientSurfaceContext = createContext<ClientSurfaceFlags | null>(null);

export function ClientSurfaceProvider({
  flags,
  children,
}: {
  flags: ClientSurfaceFlags;
  children: ReactNode;
}) {
  return <ClientSurfaceContext.Provider value={flags}>{children}</ClientSurfaceContext.Provider>;
}

export function useClientSurface(): ClientSurfaceFlags | null {
  return useContext(ClientSurfaceContext);
}
