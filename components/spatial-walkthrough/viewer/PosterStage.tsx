"use client";

type Props = {
  posterUrl?: string | null;
  title: string;
  showButton?: boolean;
  onEnter?: () => void;
};

export function PosterStage({ posterUrl, title, showButton = false, onEnter }: Props) {
  return (
    <div className="sw-poster-gate" data-testid="sw-poster-gate">
      {posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt="" />
      ) : (
        <div className="sw-poster-fallback" aria-hidden />
      )}
      {showButton ? (
        <button type="button" className="sw-enter-btn" onClick={onEnter}>
          Play / Enter Walkthrough
        </button>
      ) : null}
      <p className="sw-poster-caption">{title}</p>
    </div>
  );
}
