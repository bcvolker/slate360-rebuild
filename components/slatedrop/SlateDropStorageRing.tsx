type SlateDropStorageRingProps = {
  usedGb: number;
  limitGb: number;
  size?: "sm" | "md";
  className?: string;
};

function formatGb(value: number): string {
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatStorageLabel(usedGb: number, limitGb: number): string {
  return `${formatGb(usedGb)} GB of ${limitGb} GB`;
}

export function SlateDropStorageRing({
  usedGb,
  limitGb,
  size = "md",
  className = "",
}: SlateDropStorageRingProps) {
  const ratio = limitGb > 0 ? Math.min(usedGb / limitGb, 1) : 0;
  const radius = size === "sm" ? 15.5 : 20;
  const viewBox = size === "sm" ? 36 : 48;
  const center = viewBox / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const dim = size === "sm" ? "h-9 w-9" : "h-12 w-12";

  return (
    <svg
      width={viewBox}
      height={viewBox}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      className={`${dim} shrink-0 text-[var(--graphite-primary)] ${className}`}
      aria-hidden
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="3"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
}
