"use client";

import { useEffect, useState } from "react";

/** °F is the product default (Brian, 2026-07-07); the choice persists per browser. */
export function useUnitPreference() {
  const [unit, setUnitState] = useState<"C" | "F">("F");
  useEffect(() => {
    if (window.localStorage.getItem("thermal-v2-unit") === "C") setUnitState("C");
  }, []);
  function setUnit(u: "C" | "F") {
    setUnitState(u);
    try {
      window.localStorage.setItem("thermal-v2-unit", u);
    } catch {
      // storage unavailable (private mode) — preference just won't persist
    }
  }
  return { unit, setUnit };
}
