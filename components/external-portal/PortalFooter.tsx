export function PortalFooter({ orgName }: { orgName?: string }) {
  return (
    <footer className="shrink-0 border-t border-white/10 py-4 text-center">
      <p className="text-[10px] text-slate-500">
        Secured by{" "}
        <a
          href="https://www.slate360.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-amber-400/90 hover:text-amber-300"
        >
          Slate360
        </a>
        {orgName ? (
          <>
            {" "}
            · Shared on behalf of <span className="text-slate-400">{orgName}</span>
          </>
        ) : null}
      </p>
    </footer>
  );
}
