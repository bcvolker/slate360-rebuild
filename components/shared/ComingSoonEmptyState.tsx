import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ComingSoonEmptyState — the ONLY content unbuilt pages should render.
 *
 * Per product direction: pages we have not built yet must NOT contain
 * placeholder metrics, fake widgets, lorem-ipsum cards, or any other
 * content we'll have to delete later. Render this and nothing else.
 */
interface ComingSoonEmptyStateProps {
  title: string;
  /** Optional one-line description. Keep it short or omit. */
  description?: string;
  /** Optional brand icon. */
  icon?: LucideIcon;
  className?: string;
}

export function ComingSoonEmptyState({
  title,
  description,
  icon: Icon,
  className,
}: ComingSoonEmptyStateProps) {
  return (
    <div
      className={cn(
        "min-h-[calc(100vh-7rem)] flex items-center justify-center px-6",
        className,
      )}
    >
      <div className="mx-auto max-w-md text-center">
        {Icon ? (
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-primary">
            <Icon className="h-6 w-6" />
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold text-zinc-100">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm text-zinc-500">{description}</p>
        ) : null}
        <span className="mt-5 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Coming soon
        </span>
      </div>
    </div>
  );
}

export default ComingSoonEmptyState;
