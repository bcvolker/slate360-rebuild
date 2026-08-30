"use client";

import type { CompareAnchor } from "@/lib/spatial-walkthrough/compare-anchor";
import type { MatchCandidate } from "@/lib/spatial-walkthrough/compare-match";

type Props = {
  anchors: CompareAnchor[];
  candidates: MatchCandidate[];
  onMatch: () => void;
  onConfirm: (hit: MatchCandidate) => void;
};

export function CompareAuthor({ anchors, candidates, onMatch, onConfirm }: Props) {
  return (
    <section className="sw-compare-author" aria-label="Compare Anchor authoring">
      <p className="sw-compare-kicker">Compare Anchor</p>
      <button type="button" onClick={onMatch}>Match this view to another date</button>
      {candidates.length > 0 ? (
        <ul>
          {candidates.map((hit) => (
            <li key={`${hit.locator.clipId}-${hit.locator.tSeconds}`}>
              <span>{hit.label} · {hit.reason} · {Math.round(hit.score * 100)}</span>
              <button type="button" className="sw-compare-match" onClick={() => onConfirm(hit)}>Use match</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sw-compare-note">{anchors.length} authored anchors. Matching uses chapter names and waypoint labels, not geometry.</p>
      )}
    </section>
  );
}
