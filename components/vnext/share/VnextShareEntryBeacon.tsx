"use client";

import { useEffect } from "react";
import { isShareToken } from "@/lib/vnext/share/share-rules";

export function VnextShareEntryBeacon({ token }: { token: string }) {
  useEffect(() => {
    if (!isShareToken(token)) return;
    void fetch(`/share/project/${token}/entry`, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    });
  }, [token]);
  return null;
}
