"use client";

import { formatCaptureDate, type DatePair } from "@/lib/spatial-walkthrough/compare-dates";

type Props = {
  pairs: DatePair[];
  selected: DatePair | null;
  onSelect: (pair: DatePair) => void;
};

export function CompareDatePair({ pairs, selected, onSelect }: Props) {
  return (
    <div className="sw-compare-pairs" role="group" aria-label="Date pair">
      {pairs.map((pair) => {
        const id = `${pair.before.walkthroughId}:${pair.after.walkthroughId}`;
        const pressed = selected?.before.walkthroughId === pair.before.walkthroughId
          && selected.after.walkthroughId === pair.after.walkthroughId;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSelect(pair)}
          >
            {formatCaptureDate(pair.before.capturedAt)} → {formatCaptureDate(pair.after.capturedAt)}
          </button>
        );
      })}
    </div>
  );
}
