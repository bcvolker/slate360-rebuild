import type { ReactNode } from "react";
import { PublicSiteChrome } from "@/components/marketing/PublicSiteChrome";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicSiteChrome>{children}</PublicSiteChrome>;
}
