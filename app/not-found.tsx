import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <h1 className="text-6xl font-bold text-[#F59E0B]">404</h1>
      <p className="mt-4 text-lg text-zinc-400">Page not found</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-[#F59E0B] px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-[#F59E0B]/80 transition-colors"
      >
        Back to Home
      </Link>
    </main>
  );
}
