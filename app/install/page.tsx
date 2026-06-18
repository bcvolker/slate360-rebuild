import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InstallClient from "@/components/install/InstallClient";
import { SlateLogo } from "@/components/shared/SlateLogo";

export const metadata = {
  title: "Install Slate360",
  description: "Install the Slate360 PWA on your phone or tablet for the best Site Walk field experience.",
};

export default function InstallPage() {
  return (
    <main className="dark min-h-screen bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)] px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="flex items-center justify-between border-b border-white/10 pb-4">
          <Link href="/">
            <SlateLogo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--graphite-muted)] transition-colors hover:text-[var(--graphite-text-header)]"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </header>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight text-[var(--graphite-text-header)]">Install Slate360</h1>
          <p className="text-sm leading-relaxed text-[var(--graphite-muted)]">
            Install Slate360 from your browser for a full-screen app experience on iOS and Android — ideal
            for Site Walk in the field. No app store required.
          </p>
        </div>

        <InstallClient />

        <div className="border-t border-white/10 pt-4">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 px-6 text-sm font-semibold text-[var(--graphite-text-body)] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] hover:text-[var(--graphite-primary)]"
          >
            Continue in browser instead
          </Link>
        </div>
      </div>
    </main>
  );
}
