"use client";

import type { ClipEdgeAction } from "@/lib/spatial-walkthrough/clip-edge-actions";

type Props = {
  actions: ClipEdgeAction[];
  onSelect: (action: ClipEdgeAction) => void;
};

export function ClipEdgeActions({ actions, onSelect }: Props) {
  if (actions.length === 0) return null;
  return (
    <div className="sw-edge-actions" role="group" aria-label="Clip transition">
      {actions.map((action) => (
        <button
          key={action.edgeId}
          type="button"
          className="sw-chrome-btn"
          data-accent="true"
          data-edge-action={action.id}
          onClick={() => onSelect(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
