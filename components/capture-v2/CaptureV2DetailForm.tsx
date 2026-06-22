"use client";

import {
  CAPTURE_CLASSIFICATIONS,
  CAPTURE_ITEM_STATUSES,
  CAPTURE_PRIORITIES,
  type CaptureAssignee,
  type CaptureItemDraft,
} from "@/lib/types/site-walk-capture";

type Props = {
  draft: CaptureItemDraft;
  locationLabel: string;
  assignees: CaptureAssignee[];
  tradeOptions: string[];
  compact?: boolean;
  onPatch: (patch: Partial<CaptureItemDraft>) => void;
  onLocationChange: (value: string) => void;
  onApplyChip: (index: number) => void;
  chips: ReadonlyArray<{ label: string }>;
};

const fieldClass =
  "mt-1 w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold text-white outline-none ring-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] focus:ring-2";
const labelClass = "text-[10px] font-black uppercase tracking-[0.16em] text-slate-500";
const selectClass = `${fieldClass} h-10 text-xs font-black`;

export function CaptureV2DetailForm({
  draft,
  locationLabel,
  assignees,
  tradeOptions,
  compact = false,
  onPatch,
  onLocationChange,
  onApplyChip,
  chips,
}: Props) {
  return (
    <div className={`space-y-3 ${compact ? "" : "pb-2"}`}>
      <label className="block text-left">
        <span className={labelClass}>Title</span>
        <input
          value={draft.title}
          onChange={(event) => onPatch({ title: event.target.value })}
          className={fieldClass}
          placeholder="Stop title"
        />
      </label>

      {!compact && (
        <label className="block text-left">
          <span className={labelClass}>Field notes</span>
          <textarea
            value={draft.notes}
            onChange={(event) => onPatch({ notes: event.target.value })}
            rows={compact ? 3 : 5}
            placeholder="Type what happened, what changed, and who owns the next action…"
            className={`${fieldClass} min-h-[6rem] resize-none leading-6`}
            style={{ WebkitUserSelect: "text", userSelect: "text" }}
            onPointerDown={(event) => event.stopPropagation()}
          />
        </label>
      )}

      {compact && (
        <label className="block text-left">
          <span className={labelClass}>Notes</span>
          <textarea
            value={draft.notes}
            onChange={(event) => onPatch({ notes: event.target.value })}
            rows={2}
            className={`${fieldClass} resize-none leading-6`}
            onPointerDown={(event) => event.stopPropagation()}
          />
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        {chips.map((chip, index) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onApplyChip(index)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] hover:text-[var(--graphite-primary)]"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {!compact && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-left">
              <span className={labelClass}>Status</span>
              <select
                value={draft.status}
                onChange={(event) =>
                  onPatch({ status: event.target.value as CaptureItemDraft["status"] })
                }
                className={selectClass}
              >
                {CAPTURE_ITEM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatOption(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-left">
              <span className={labelClass}>Priority</span>
              <select
                value={draft.priority}
                onChange={(event) =>
                  onPatch({ priority: event.target.value as CaptureItemDraft["priority"] })
                }
                className={selectClass}
              >
                {CAPTURE_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {formatOption(priority)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-left">
              <span className={labelClass}>Classification</span>
              <select
                value={draft.classification}
                onChange={(event) =>
                  onPatch({
                    classification: event.target.value as CaptureItemDraft["classification"],
                  })
                }
                className={selectClass}
              >
                {CAPTURE_CLASSIFICATIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-left">
              <span className={labelClass}>Trade</span>
              <select
                value={draft.trade}
                onChange={(event) => onPatch({ trade: event.target.value })}
                className={selectClass}
              >
                <option value="">Select trade…</option>
                {tradeOptions.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-left">
            <span className={labelClass}>Room / area / location</span>
            <input
              value={locationLabel}
              onChange={(event) => onLocationChange(event.target.value)}
              className={fieldClass}
              placeholder="e.g. Level 2 · East corridor"
            />
          </label>

          {assignees.length > 0 && (
            <label className="block text-left">
              <span className={labelClass}>Assignee</span>
              <select
                value={draft.assignedTo}
                onChange={(event) => onPatch({ assignedTo: event.target.value })}
                className={selectClass}
              >
                <option value="">Unassigned</option>
                {assignees
                  .filter((assignee) => assignee.assignable)
                  .map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.label}
                    </option>
                  ))}
              </select>
            </label>
          )}

          <label className="block text-left">
            <span className={labelClass}>Due date</span>
            <input
              type="date"
              value={draft.dueDate ? draft.dueDate.slice(0, 10) : ""}
              onChange={(event) =>
                onPatch({ dueDate: event.target.value ? event.target.value : "" })
              }
              className={fieldClass}
            />
          </label>
        </>
      )}
    </div>
  );
}

function formatOption(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
