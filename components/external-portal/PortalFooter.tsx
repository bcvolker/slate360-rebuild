export function PortalFooter({ orgName }: { orgName?: string }) {
  return (
    <footer className="shrink-0 border-t border-[var(--portal-line)] py-4 text-center">
      <p className="text-xs text-[var(--portal-ink-muted)]">
        Secured by{" "}
        <a href="https://www.slate360.ai" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--portal-accent)] hover:underline">
          Slate360
        </a>
        {orgName ? (
          <>
            {" "}
            · Shared on behalf of <span className="text-[var(--portal-ink)]">{orgName}</span>
          </>
        ) : null}
      </p>
    </footer>
  );
}
