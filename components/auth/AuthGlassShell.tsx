import Link from "next/link";
import { SlateIcon } from "@/components/shared/SlateIcon";

type AuthGlassShellProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthGlassShell({ children, footer }: AuthGlassShellProps) {
  return (
    <div className="auth-page">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="auth-card">
          <div className="mb-8 flex justify-center">
            <Link href="/" aria-label="Slate360 home">
              <SlateIcon className="h-12 w-12" />
            </Link>
          </div>
          {children}
        </div>
      </div>
      {footer ? <div className="auth-footer pb-8">{footer}</div> : null}
    </div>
  );
}
