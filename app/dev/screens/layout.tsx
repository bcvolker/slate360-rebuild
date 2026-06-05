import { notFound } from "next/navigation";
import { isDevScreensEnabled } from "@/lib/dev/dev-screens-enabled";

export default function DevScreensLayout({ children }: { children: React.ReactNode }) {
  if (!isDevScreensEnabled()) notFound();
  return children;
}
