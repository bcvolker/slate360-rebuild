"use client";

type Props = {
  posterUrl?: string | null;
  title: string;
  showButton?: boolean;
  onEnter?: () => void;
  onPosterLoad?: () => void;
};

export function PosterStage({ posterUrl, title, showButton = false, onEnter, onPosterLoad }: Props) {
  return (
    <div className="sw-poster-gate" data-testid="sw-poster-gate">
      {posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt={title} onLoad={() => onPosterLoad?.()} />
      ) : (
        <div className="sw-poster-fallback" aria-hidden />
      )}
      {showButton ? (
        <button type="button" className="sw-enter-btn" data-testid="sw-enter" onClick={onEnter}>
          Play / Enter Walkthrough
        </button>
      ) : null}
    </div>
  );
}
