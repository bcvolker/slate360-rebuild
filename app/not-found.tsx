import Link from "next/link";
import { SlateLogo } from "@/components/shared/SlateLogo";

export default function NotFound() {
  return (
    <main className="dark flex min-h-screen flex-col items-center justify-center bg-[var(--graphite-canvas)] p-6 text-[var(--graphite-text-body)]">
      <Link href="/" className="mb-10">
        <SlateLogo size="lg" />
      </Link>
      <p className="text-6xl font-bold text-[var(--graphite-primary)]">404</p>
      <p className="mt-4 text-lg text-[var(--graphite-muted)]">This page could not be found.</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-[var(--graphite-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90"
      >
        Back to home
      </Link>
    </main>
  );
}
