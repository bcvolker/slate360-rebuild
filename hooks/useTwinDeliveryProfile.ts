"use client";

import { useEffect, useState } from "react";

export type TwinDeliveryProfile = {
  mobile: boolean;
  dpr: [number, number];
  antialias: boolean;
  allowDollhouse: boolean;
  allowMeasure: boolean;
};

const DESKTOP: TwinDeliveryProfile = {
  mobile: false,
  dpr: [1, 1.5],
  antialias: true,
  allowDollhouse: true,
  allowMeasure: true,
};

const MOBILE: TwinDeliveryProfile = {
  mobile: true,
  dpr: [1, 1],
  antialias: false,
  allowDollhouse: false,
  allowMeasure: false,
};

export function useTwinDeliveryProfile(): TwinDeliveryProfile {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const sync = () => {
      const narrow = window.matchMedia("(max-width: 1023px)").matches;
      setMobile(narrow);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  return mobile ? MOBILE : DESKTOP;
}
