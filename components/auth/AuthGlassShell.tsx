import Link from "next/link";
import { HomeBrandMark } from "@/components/marketing/HomeBrandMark";

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
              <HomeBrandMark iconClassName="h-9" wordClassName="text-[17px]" />
            </Link>
          </div>
          {children}
        </div>
      </div>
      {footer ? <div className="auth-footer pb-8">{footer}</div> : null}
    </div>
  );
}
