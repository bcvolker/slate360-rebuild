import Image from "next/image";
import { Box, MousePointerClick, Play } from "lucide-react";
import type { ReactNode } from "react";

type MediaKind = "video" | "twin" | "interactive" | "image";

type ProductMediaFrameProps = {
  /** Accessible label, also shown on the placeholder. */
  label: string;
  /** CSS aspect ratio, e.g. "16 / 10". Defaults to 16/10. */
  aspect?: string;
  /** Plays an inline video with controls when provided. */
  videoSrc?: string;
  poster?: string;
  /** Embeds an interactive source (a live digital twin viewer, hosted demo, etc.). */
  embedSrc?: string;
  /** Renders a still image. */
  imageSrc?: string;
  imageAlt?: string;
  /** Custom interactive content (e.g. <PhoneDemo />, a 3D viewer). Highest priority. */
  children?: ReactNode;
  /** Hint for the placeholder icon/copy when no media is wired yet. */
  placeholderKind?: MediaKind;
  /** Render children flush to the frame edges (no padding/centering) — for canvases/embeds. */
  flush?: boolean;
  className?: string;
};

const PLACEHOLDER = {
  video: { icon: Play, copy: "Video walkthrough", sub: "Drop an MP4/WebM clip here." },
  twin: { icon: Box, copy: "Interactive 3D twin", sub: "Embed a live, explorable twin here." },
  interactive: { icon: MousePointerClick, copy: "Interactive demo", sub: "Embed a live, clickable demo here." },
  image: { icon: Play, copy: "Visual example", sub: "Drop an image here." },
} as const;

/**
 * A polished media frame for marketing product pages. Renders (in priority order)
 * custom interactive children, an embedded interactive source, an inline video,
 * a still image, or — when no asset is wired yet — an attractive placeholder that
 * signals exactly what kind of visual belongs here. This keeps the pages visual
 * and lets real videos / live twins be slotted in later without layout changes.
 */
export function ProductMediaFrame({
  label,
  aspect = "16 / 10",
  videoSrc,
  poster,
  embedSrc,
  imageSrc,
  imageAlt,
  children,
  placeholderKind = "interactive",
  flush,
  className,
}: ProductMediaFrameProps) {
  const frame =
    "relative w-full overflow-hidden rounded-2xl border border-white/[0.10] bg-slate-900/50 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]";

  let content: ReactNode;
  if (children) {
    content = flush ? (
      <div className="absolute inset-0">{children}</div>
    ) : (
      <div className="absolute inset-0 flex items-center justify-center p-4">{children}</div>
    );
  } else if (embedSrc) {
    content = (
      <iframe
        src={embedSrc}
        title={label}
        loading="lazy"
        allow="accelerometer; gyroscope; xr-spatial-tracking; fullscreen"
        className="absolute inset-0 h-full w-full border-0"
      />
    );
  } else if (videoSrc) {
    content = (
      // eslint-disable-next-line jsx-a11y/media-has-caption -- marketing demo loops, captions live in adjacent copy
      <video
        src={videoSrc}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  } else if (imageSrc) {
    content = (
      <Image src={imageSrc} alt={imageAlt ?? label} fill sizes="(max-width: 1024px) 100vw, 560px" className="object-cover" />
    );
  } else {
    const p = PLACEHOLDER[placeholderKind];
    const Icon = p.icon;
    content = (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_50%_35%,rgba(0,230,153,0.12),transparent_70%)] text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00E699]/30 bg-[#00E699]/10 text-[#00E699]">
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-[#F8FAFC]">{p.copy}</p>
          <p className="mt-1 text-xs text-[#A3AED0]">{p.sub}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={frame} style={{ aspectRatio: aspect }} aria-label={label} role="group">
        {content}
      </div>
    </div>
  );
}
