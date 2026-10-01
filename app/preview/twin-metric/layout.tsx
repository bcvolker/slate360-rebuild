export default function TwinMetricLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        html, body { background: var(--graphite-canvas) !important; }
        nextjs-portal { display: none !important; }
      `}</style>
      {children}
    </>
  );
}
