/**
 * Minimal Pages Router error fallback.
 *
 * Next.js 15 App Router still generates internal /404 and /500 static pages
 * through the Pages Router compatibility layer. Without this file, Next.js
 * uses its built-in _error.js which imports from next/document. That import
 * throws "Html should not be imported outside of pages/_document" during
 * static page generation and breaks the production build.
 *
 * This minimal override keeps the fallback clean and removes the bad import.
 */

type Props = { statusCode: number | null };

export default function ErrorPage({ statusCode }: Props) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "3rem", fontWeight: "bold" }}>
        {statusCode ?? "Error"}
      </h1>
      <p style={{ marginTop: "1rem", color: "#6b7280" }}>
        {statusCode === 404
          ? "Page not found"
          : statusCode === 500
            ? "Internal server error"
            : "An unexpected error occurred"}
      </p>
    </main>
  );
}

ErrorPage.getInitialProps = ({
  res,
  err,
}: {
  res?: { statusCode: number };
  err?: { statusCode?: number };
}) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? null;
  return { statusCode };
};
