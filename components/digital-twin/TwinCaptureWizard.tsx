"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Coins, Plus } from "lucide-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import {
  MOCK_TWIN_CAPTURE_ASSETS,
  MOCK_TWIN_CREDIT_BALANCE,
  MOCK_TWIN_SPACES,
  TWIN_OUTPUT_OPTIONS,
  TWIN_QUALITY_OPTIONS,
  TWIN_SPEED_OPTIONS,
  estimateTwinSubmission,
  formatTwinBytes,
  formatTwinDuration,
  labelOutputType,
  type TwinOutputType,
  type TwinQualityTier,
  type TwinSpeedTier,
  type TwinSubmissionChoices,
} from "@/lib/dev/mock-twin-capture";

type Props = {
  initialSpaceId?: string;
  onBack?: () => void;
  onSubmit?: () => void;
};

const STEPS = ["Space", "Output", "Review"] as const;

function ChoiceChip<T extends string>({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full flex-col items-start justify-center rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
        active
          ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)]"
          : "border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)]"
      }`}
    >
      <span
        className={`text-sm font-bold ${active ? twinAccent.text : "text-[var(--graphite-text-header)]"}`}
      >
        {label}
      </span>
      {hint ? (
        <span className="text-[11px] font-medium text-[var(--graphite-muted)]">{hint}</span>
      ) : null}
    </button>
  );
}

export function TwinCaptureWizard({
  initialSpaceId,
  onBack,
  onSubmit,
}: Props) {
  const [step, setStep] = useState(0);
  const [spaceId, setSpaceId] = useState(initialSpaceId ?? MOCK_TWIN_SPACES[0]?.id ?? "");
  const [choices, setChoices] = useState<TwinSubmissionChoices>({
    outputType: "gaussian_splat",
    quality: "standard",
    speed: "standard",
  });

  const space = MOCK_TWIN_SPACES.find((row) => row.id === spaceId) ?? MOCK_TWIN_SPACES[0];
  const estimate = useMemo(
    () => estimateTwinSubmission(MOCK_TWIN_CAPTURE_ASSETS, choices),
    [choices],
  );
  const totalBytes = MOCK_TWIN_CAPTURE_ASSETS.reduce((sum, row) => sum + row.sizeBytes, 0);
  const totalCount = MOCK_TWIN_CAPTURE_ASSETS.reduce((sum, row) => sum + row.count, 0);
  const balanceAfter = MOCK_TWIN_CREDIT_BALANCE - estimate.credits;

  function patchChoices(patch: Partial<TwinSubmissionChoices>) {
    setChoices((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)]">
      <header className="shrink-0 border-b border-[var(--mobile-app-card-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] text-[var(--graphite-text-header)]"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
              Submission wizard
            </p>
            <p className="truncate text-sm font-bold text-[var(--graphite-text-header)]">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
          </div>
          <span
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold ${twinAccent.iconChip}`}
          >
            <Coins className="h-3.5 w-3.5" />
            {MOCK_TWIN_CREDIT_BALANCE}
          </span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={`h-1 flex-1 rounded-full ${
                index <= step
                  ? "bg-[var(--twin360-blue)]"
                  : "bg-[color-mix(in_srgb,var(--surface-zinc-border)_80%,transparent)]"
              }`}
              aria-hidden
            />
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--graphite-muted)]">
              Pick an existing space or create a new one for this capture session.
            </p>
            {MOCK_TWIN_SPACES.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSpaceId(row.id)}
                className={`w-full rounded-xl border p-3 text-left transition active:scale-[0.99] ${
                  spaceId === row.id
                    ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_8%,var(--surface-zinc))]"
                    : "border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)]"
                }`}
              >
                <p className="text-sm font-bold text-[var(--graphite-text-header)]">{row.name}</p>
                <p className="mt-0.5 text-xs text-[var(--graphite-muted)]">
                  {row.projectName} · {row.assetCount} assets
                </p>
              </button>
            ))}
            <button
              type="button"
              className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-dashed ${twinAccent.button}`}
            >
              <Plus className="h-4 w-4" />
              Create new space
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <section className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
                Output type
              </h2>
              {TWIN_OUTPUT_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option.id}
                  active={choices.outputType === option.id}
                  label={option.label}
                  hint={option.hint}
                  onClick={() => patchChoices({ outputType: option.id as TwinOutputType })}
                />
              ))}
            </section>
            <section className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
                Quality
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {TWIN_QUALITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => patchChoices({ quality: option.id as TwinQualityTier })}
                    className={`min-h-14 rounded-xl border text-sm font-bold transition active:scale-[0.99] ${
                      choices.quality === option.id
                        ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] text-[var(--twin360-blue)]"
                        : "border-[var(--mobile-app-card-border)] text-[var(--graphite-text-header)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
            <section className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
                Speed
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {TWIN_SPEED_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => patchChoices({ speed: option.id as TwinSpeedTier })}
                    className={`min-h-14 rounded-xl border text-sm font-bold transition active:scale-[0.99] ${
                      choices.speed === option.id
                        ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] text-[var(--twin360-blue)]"
                        : "border-[var(--mobile-app-card-border)] text-[var(--graphite-text-header)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_6%,var(--surface-zinc))] p-4">
              <p className="text-xs font-semibold text-[var(--graphite-muted)]">Live estimate</p>
              <div className="mt-2 flex flex-wrap items-end gap-4">
                <div>
                  <p className={`text-2xl font-black ${twinAccent.text}`}>{estimate.credits}</p>
                  <p className="text-[11px] font-semibold text-[var(--graphite-muted)]">credits</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[var(--graphite-text-header)]">
                    {formatTwinDuration(estimate.minutes)}
                  </p>
                  <p className="text-[11px] font-semibold text-[var(--graphite-muted)]">
                    processing
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--graphite-muted)]">
                Adding more data later only charges for new uploads — existing assets in this space
                are not re-billed.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-3 text-xs">
              <p className="font-bold text-[var(--graphite-text-header)]">{space?.name}</p>
              <p className="mt-1 text-[var(--graphite-muted)]">
                {labelOutputType(choices.outputType)} · {choices.quality} · {choices.speed}
              </p>
              <p className="mt-1 text-[var(--graphite-muted)]">
                {totalCount} files · {formatTwinBytes(totalBytes)}
              </p>
            </div>

            <ul className="space-y-2">
              {MOCK_TWIN_CAPTURE_ASSETS.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-[var(--graphite-text-header)]">
                    {asset.name}
                  </span>
                  <span className="text-[var(--graphite-muted)]">
                    {asset.count} · {formatTwinBytes(asset.sizeBytes)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-3 text-xs">
              <p className="font-bold text-[var(--graphite-text-header)]">Cost breakdown</p>
              <ul className="mt-2 space-y-1.5">
                {estimate.breakdown.map((line) => (
                  <li key={line.label} className="flex justify-between gap-2 text-[var(--graphite-muted)]">
                    <span>{line.label}</span>
                    <span>
                      {line.credits} cr · {formatTwinDuration(line.minutes)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-[var(--mobile-app-card-border)] pt-2 font-semibold text-[var(--graphite-text-header)]">
                Balance after submit:{" "}
                <span className={balanceAfter >= 0 ? twinAccent.text : "text-red-300"}>
                  {balanceAfter} credits
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-[var(--mobile-app-card-border)] px-4 py-3 pb-[max(calc(0.75rem+env(safe-area-inset-bottom)),1rem)]">
        <div className="flex gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((value) => value - 1)}
              className="inline-flex min-h-14 flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--mobile-app-card-border)] text-sm font-bold text-[var(--graphite-text-header)]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((value) => value + 1)}
              disabled={!spaceId}
              className={`inline-flex min-h-14 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-bold ${twinAccent.button}`}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={balanceAfter < 0}
              className={`inline-flex min-h-14 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-bold ${twinAccent.button}`}
            >
              <Check className="h-4 w-4" />
              Submit for processing
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
