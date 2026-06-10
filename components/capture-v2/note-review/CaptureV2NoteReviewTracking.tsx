"use client";

import {
  CAPTURE_CLASSIFICATIONS,
  CAPTURE_ITEM_STATUSES,
  CAPTURE_PRIORITIES,
  type CaptureAssignee,
  type CaptureItemDraft,
} from "@/lib/types/site-walk-capture";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  draft: CaptureItemDraft;
  assignees: CaptureAssignee[];
  onPatch: (patch: Partial<CaptureItemDraft>) => void;
};

function formatOption(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CaptureV2NoteReviewTracking({ draft, assignees, onPatch }: Props) {
  const priorityClass =
    draft.priority === "critical"
      ? `${noteReviewTokens.selectField} ${noteReviewTokens.criticalPriority}`
      : noteReviewTokens.selectField;

  return (
    <section className={`${noteReviewTokens.margin} min-w-0 space-y-2 pb-3`} data-note-review="tracking">
      <span className={noteReviewTokens.sectionLabel}>Tracking</span>
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <label className="block min-w-0 text-left">
          <span className="sr-only">Status</span>
          <select
            value={draft.status}
            onChange={(event) =>
              onPatch({ status: event.target.value as CaptureItemDraft["status"] })
            }
            className={noteReviewTokens.selectField}
            aria-label="Status"
          >
            {CAPTURE_ITEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatOption(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 text-left">
          <span className="sr-only">Priority</span>
          <select
            value={draft.priority}
            onChange={(event) =>
              onPatch({ priority: event.target.value as CaptureItemDraft["priority"] })
            }
            className={priorityClass}
            aria-label="Priority"
          >
            {CAPTURE_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {formatOption(priority)}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 text-left">
          <span className="sr-only">Assignee</span>
          <select
            value={draft.assignedTo}
            onChange={(event) => onPatch({ assignedTo: event.target.value })}
            className={noteReviewTokens.selectField}
            aria-label="Assignee"
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
        <label className="relative block min-w-0 text-left">
          <span className="sr-only">Due date</span>
          {!draft.dueDate ? (
            <span
              className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm font-medium text-[var(--graphite-muted)]"
              aria-hidden
            >
              Due date
            </span>
          ) : null}
          <input
            type="date"
            value={draft.dueDate ? draft.dueDate.slice(0, 10) : ""}
            onChange={(event) =>
              onPatch({ dueDate: event.target.value ? event.target.value : "" })
            }
            className={noteReviewTokens.selectField}
            aria-label="Due date"
          />
        </label>
      </div>
      <label className="block min-w-0 text-left">
        <span className={noteReviewTokens.sectionLabel}>Classification</span>
        <select
          value={draft.classification}
          onChange={(event) =>
            onPatch({
              classification: event.target.value as CaptureItemDraft["classification"],
            })
          }
          className={`mt-1 ${noteReviewTokens.selectField}`}
          aria-label="Classification"
        >
          {CAPTURE_CLASSIFICATIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
