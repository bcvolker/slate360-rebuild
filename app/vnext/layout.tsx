import type { ReactNode } from "react";
import { VnextRoot } from "@/components/vnext/VnextRoot";

export const metadata = {
  title: "Slate360",
};

export default function VnextLayout({ children }: { children: ReactNode }) {
  return <VnextRoot>{children}</VnextRoot>;
}
