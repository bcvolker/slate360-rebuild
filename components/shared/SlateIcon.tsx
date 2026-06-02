/**
 * SlateIcon — standalone Slate360 app icon mark (matches assets/brand/slate360-icon.svg).
 *
 * Green gradient upper arm (#00E699 → #0f2a21), white lower arm, #0B0F15 canvas.
 * Used in mobile headers, PWA surfaces, and anywhere the icon-only mark appears.
 */

import { cn } from "@/lib/utils";
import { useId, type SVGProps } from "react";

const S_EMBLEM_UPPER =
  "M14.69,56.05L85.78,16.38c1.78-1.2,3.91-1.9,6.17-1.9,2.07,0,4.05.58,5.74,1.6l76.81,42.86v25.19s-82.5-46.04-82.5-46.04l-54.56,30.45c-.2.11-.75.42-.75,1.27s.54,1.16.75,1.27l80.45,44.9-22.51,12.63L14.69,83.59v-27.54Z";

const S_EMBLEM_LOWER =
  "M94.9,57.31l-22.44,12.67,79.29,45.4c.2.11.75.42.75,1.27s-.54,1.16-.75,1.27l-50.3,28.08-4.27,2.38-4.27-2.38L14.69,102.33v25.2s77.14,43.07,77.14,43.07c1.67.93,3.51,1.4,5.36,1.4s3.7-.46,5.36-1.4l71.95-40.17v-27.34l-79.6-45.78Z";

interface SlateIconProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

export function SlateIcon({ className, ...svgProps }: SlateIconProps) {
  const gradientId = `slate360-icon-gradient-${useId().replace(/:/g, "")}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 189.2 186.47"
      role="img"
      aria-label="Slate360"
      className={cn(className ?? "h-9 w-9")}
      {...svgProps}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00E699" />
          <stop offset="100%" stopColor="#0f2a21" />
        </linearGradient>
      </defs>
      <rect width="189.2" height="186.47" rx="30.69" ry="30.69" fill="#0B0F15" />
      <path fill={`url(#${gradientId})`} d={S_EMBLEM_UPPER} />
      <path fill="#ffffff" d={S_EMBLEM_LOWER} />
    </svg>
  );
}
