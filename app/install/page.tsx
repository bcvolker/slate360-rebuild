import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InstallClient from "@/components/install/InstallClient";

export const metadata = { title: "Install Slate360" };

export default function InstallPage() {
  return (
    <main className="min-h-screen bg-app text-foreground px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <header className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">Install Slate360</h1>
          <p className="text-muted-foreground text-sm">
            Slate360 installs as an app directly from your browser — no App Store, no
            download. Follow the steps for your device below.
          </p>
        </header>

        <InstallClient />

        <div className="pt-4 border-t border-app">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-12 px-6 rounded-md border border-app text-sm font-semibold hover:bg-app-card"
          >
            Continue in browser instead
          </Link>
        </div>
      </div>
    </main>
  );
}
