import Link from "next/link";
import { SlateLogo } from "@/components/shared/SlateLogo";

export default function NotFound() {
  return (
    <main className="dark flex min-h-screen flex-col items-center justify-center bg-[#0B0F15] p-6 text-slate-200">
      <Link href="/" className="mb-10">
        <SlateLogo size="lg" />
      </Link>
      <p className="text-6xl font-bold text-amber-400">404</p>
      <p className="mt-4 text-lg text-slate-400">This page could not be found.</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-amber-600 px-6 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-500"
      >
        Back to home
      </Link>
    </main>
  );
}
