import Link from "next/link";
import { Smartphone, ArrowLeft } from "lucide-react";

export const metadata = { title: "Install Slate360" };

export default function InstallPage() {
  return (
    <main className="min-h-screen bg-app text-foreground px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-cobalt-soft px-3 py-1 text-xs font-medium text-cobalt">
            <Smartphone className="h-3.5 w-3.5" /> Beta install
          </div>
          <h1 className="text-3xl font-bold">Install Slate360 on your device</h1>
          <p className="text-muted-foreground">
            Slate360 is a Progressive Web App — no App Store needed during beta. Pick
            your device below.
          </p>
        </header>

        <Section title="iPhone &amp; iPad">
          <ol className="space-y-2 list-decimal list-inside text-sm">
            <li>Open this page in <strong>Safari</strong> (not Chrome or Firefox).</li>
            <li>Tap the <strong>Share</strong> icon at the bottom of the screen.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong> in the top-right corner.</li>
          </ol>
        </Section>

        <Section title="Android">
          <ol className="space-y-2 list-decimal list-inside text-sm">
            <li>Open this page in <strong>Chrome</strong>.</li>
            <li>Tap the <strong>⋮</strong> menu (top-right).</li>
            <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
            <li>Confirm by tapping <strong>Install</strong>.</li>
          </ol>
        </Section>

        <Section title="Desktop (Chrome / Edge)">
          <ol className="space-y-2 list-decimal list-inside text-sm">
            <li>Look for the <strong>Install</strong> icon in the address bar.</li>
            <li>Click <strong>Install Slate360</strong>.</li>
            <li>Slate360 opens in its own window like a native app.</li>
          </ol>
        </Section>

        <Section title="In an in-app browser (Instagram, Twitter, Gmail)?">
          <p className="text-sm text-muted-foreground">
            In-app browsers can&rsquo;t install apps. Tap the <strong>···</strong> menu
            and choose <strong>Open in Safari</strong> (iOS) or <strong>Open in Chrome</strong>{" "}
            (Android), then return to this page.
          </p>
        </Section>

        <div className="pt-4 border-t border-app">
          <Link
            href="/signup?next=/dashboard"
            className="inline-flex items-center justify-center h-12 px-6 rounded-md bg-cobalt text-white font-semibold hover:bg-cobalt-hover"
          >
            Or continue in browser
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-app-card border border-app p-5 space-y-3">
      <h2 className="font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: title }} />
      {children}
    </section>
  );
}
