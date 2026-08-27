export function LogScreen({ lines }: { lines: string[] }) {
  return (
    <div className="page">
      <pre className="log">{lines.length ? lines.join("\n") : "No log lines yet."}</pre>
    </div>
  );
}
