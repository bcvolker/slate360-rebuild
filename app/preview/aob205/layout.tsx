import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "AOB 205 DSL Classroom TI — Slate360", robots: { index: false } };

/** AOB205 client-experience harness. Renders the real client components on the real AOB205 capture. */
export default function Aob205Layout({ children }: { children: ReactNode }) {
  return <div className="ce" data-app="client-experience">{children}</div>;
}
