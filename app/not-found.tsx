import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 p-6">
      <h1 className="text-6xl font-bold text-[#FF4D00]">404</h1>
      <p className="mt-4 text-lg text-gray-600">Page not found</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-[#FF4D00] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#e04400] transition-colors"
      >
        Back to Home
      </Link>
    </main>
  );
}
