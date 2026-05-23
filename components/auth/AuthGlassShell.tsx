import Link from "next/link";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";

type AuthGlassShellProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthGlassShell({ children, footer }: AuthGlassShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F15] px-4">
      <div className="w-full max-w-md rounded-xl border border-white/[0.05] bg-slate-900/40 p-8 shadow-2xl backdrop-blur-2xl">
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
