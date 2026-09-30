"use client";

type Props = {
  fade: { label: string; kind: string } | null;
};

export function ClipTransitionOverlay({ fade }: Props) {
  if (!fade) return null;
  return (
    <div className="sw-clip-fade" data-kind={fade.kind} role="status">
      <span className="sw-location-chip">{fade.label}</span>
    </div>
  );
}
