"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type DeployInfo = {
  marker: string | null;
  commit: string | null;
  branch: string | null;
  url: string | null;
  now: string | null;
};

export default function BuildRuntimeBadge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enabled = searchParams.get("buildDiag") === "1";

  const [info, setInfo] = useState<DeployInfo | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoadState("loading");

    void fetch("/api/deploy-info", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: DeployInfo) => {
        if (cancelled) return;
        setInfo(data);
        setLoadState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, pathname]);

  const commitShort = useMemo(() => {
    if (!info?.commit) return "none";
    return info.commit.slice(0, 7);
  }, [info?.commit]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-3 right-3 z-[100000] max-w-[92vw] rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 shadow-lg">
      <div className="font-semibold">build diag</div>
      <div>path: {pathname}</div>
      <div>host: {typeof window === "undefined" ? "server" : window.location.host}</div>
      <div>html-build: {typeof document === "undefined" ? "server" : document.documentElement.dataset.build ?? "missing"}</div>
      <div>commit: {loadState === "error" ? "error" : commitShort}</div>
      <div>marker: {info?.marker ?? "none"}</div>
      <div>branch: {info?.branch ?? "none"}</div>
    </div>
  );
}
