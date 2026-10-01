export default function WalkthroughShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        html, body { background: var(--graphite-canvas) !important; }
      `}</style>
      {children}
    </>
  );
}
