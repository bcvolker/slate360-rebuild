"use client";

type Props = {
  title?: string;
  logoUrl?: string | null;
};

export function PreparingWalkStage({ title, logoUrl }: Props) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center"
      data-media-state="DERIVATIVE_REQUIRED"
      data-visible-layer="preparing"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-10 w-auto max-w-[40%]" />
      ) : (
        <p className="text-lg font-semibold tracking-[0.12em] text-[var(--graphite-text-header)]">
          Slate360
        </p>
      )}
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--graphite-primary)]">
          Preparing client walkthrough
        </p>
        {title ? (
          <p className="mt-2 text-base text-[var(--graphite-text-body)]">{title}</p>
        ) : null}
      </div>
    </div>
  );
}
