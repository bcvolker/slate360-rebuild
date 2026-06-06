export function TwinViewerDisclaimer({ className }: { className?: string }) {
  return (
    <p className={className ?? "px-1 text-center text-[11px] leading-relaxed text-zinc-500"}>
      Measurements are approximate and for visual coordination only. Not for legal, structural, or
      survey use.
    </p>
  );
}
