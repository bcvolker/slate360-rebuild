import Link from "next/link";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { AUTH_CANVAS, AUTH_CARD } from "@/components/auth/auth-styles";

type AuthGlassShellProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthGlassShell({ children, footer }: AuthGlassShellProps) {
  return (
    <div className={AUTH_CANVAS}>
      <div className={AUTH_CARD}>
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Slate360 home">
            <Slate360Logo variant="dark" />
          </Link>
        </div>
        {children}
      </div>
      {footer ? <div className="mt-6 text-center text-sm text-[#A3AED0]">{footer}</div> : null}
    </div>
  );
}
