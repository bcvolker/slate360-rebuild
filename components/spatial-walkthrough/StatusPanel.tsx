type Props = {
  kicker?: string;
  title: string;
  body: string;
  action?: { href: string; label: string } | null;
};

export function StatusPanel({ kicker = "Spatial Walkthrough", title, body, action }: Props) {
  return (
    <div className="sw-status">
      <div>
        <p className="sw-status-kicker">{kicker}</p>
        <h2>{title}</h2>
        <p className="sw-status-body">{body}</p>
        {action ? (
          <p className="mt-3 text-sm">
            <a href={action.href} className="text-[var(--sw-accent,var(--graphite-primary))]">
              {action.label}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
