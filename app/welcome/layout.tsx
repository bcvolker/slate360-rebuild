import type { ReactNode } from "react";
import Link from "next/link";
import { SlateLogo } from "@/components/shared/SlateLogo";

export const metadata = {
  title: "Welcome — Slate360",
};

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <div className="w-full max-w-4xl px-6 py-6 flex justify-start">
        <Link href="/welcome" aria-label="Slate360 home">
          <SlateLogo />
        </Link>
      </div>
      <div className="w-full max-w-2xl mx-auto px-4 pb-16 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
