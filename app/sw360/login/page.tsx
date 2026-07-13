"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

function isSafeRedirectPath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//") && !url.includes("://");
}

function SW360LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get("redirectTo") ?? "/sw360";
  const redirectTo = isSafeRedirectPath(rawRedirect) ? rawRedirect : "/sw360";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="mb-10 flex flex-col items-center gap-3">
        {/* Provisional wordmark — swaps for the final logo mark once Brian
            confirms M1/M2/M3/M4 (docs/design/SITEWALK360_LOCK_SHEET.md). */}
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--sw360-charcoal)]/60">
          Site Walk
        </span>
        <h1 className="text-3xl font-black tracking-tight text-[var(--sw360-charcoal)]">
          SITE WALK <span className="text-[var(--sw360-green-light)]">360</span>
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-white/70 p-6 shadow-sm backdrop-blur-sm"
      >
        <div className="mb-5">
          <label htmlFor="sw360-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/70">
            Email
          </label>
          <input
            id="sw360-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[48px] w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="sw360-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/70">
            Password
          </label>
          <div className="relative">
            <input
              id="sw360-password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[48px] w-full rounded-lg border border-[var(--border)] bg-white px-3 pr-11 text-sm text-[var(--sw360-charcoal)] outline-none focus:border-[var(--sw360-green-light)]"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sw360-charcoal)]/50"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mb-4 text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--sw360-green-light)] text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          Sign in
        </button>
      </form>
    </div>
  );
}

export default function SW360LoginPage() {
  return (
    <Suspense fallback={null}>
      <SW360LoginForm />
    </Suspense>
  );
}
