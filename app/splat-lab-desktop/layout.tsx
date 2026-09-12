import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata = {
  title: "Slate360 Splat",
};

// Deliberately outside app/(dashboard): this is Brian's own local desktop tool, launched from a
// Desktop shortcut on his own machine, not a hosted product surface. It must open straight to the
// working UI with no sign-in step. The only thing that makes that safe is that it is reachable
// exclusively from this machine — never wire this route through a login/CEO gate, and never make
// it reachable from a non-localhost Host header (that would expose local job control to anyone who
// can reach this machine's network).
function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.split(":")[0];
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

export default async function SplatLabDesktopLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  if (!isLocalHost(h.get("host"))) notFound();
  // The dashboard's own layout normally supplies TooltipProvider app-wide; this route
  // deliberately skips that whole layout (see comment above), so every provider a
  // splat-lab component actually needs has to be supplied here instead. HelpTooltip
  // (used throughout the Splat Lab stage-option gears) crashes with "Tooltip must be used within
  // TooltipProvider" without this — root-caused from Brian's own screenshot of the error.
  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-[var(--canvas,#0B0F15)]">{children}</div>
    </TooltipProvider>
  );
}
