"use client";

import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  Sentry.captureException(error);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Something went wrong</h2>
            <p className="text-zinc-500">The error has been reported.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
