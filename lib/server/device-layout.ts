import "server-only";

import { headers } from "next/headers";
import { userAgent } from "next/server";

export async function isMobileServerLayout(): Promise<boolean> {
  const { device } = userAgent({ headers: await headers() });
  return device.type === "mobile" || device.type === "tablet" || device.type === "wearable";
}
