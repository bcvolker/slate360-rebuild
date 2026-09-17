import Link from "next/link";
import { VNEXT_LOGO_SRC } from "@/lib/vnext/copy";
import { vnextClientHomeHref } from "@/lib/vnext/nav";

type VnextLogoProps = {
  href?: string;
  compact?: boolean;
};

export function VnextLogo({ href = vnextClientHomeHref(), compact = false }: VnextLogoProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[var(--vnext-touch)] items-center py-1"
      aria-label="Slate360 home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={VNEXT_LOGO_SRC}
        alt=""
        className={
          compact
            ? "h-6 w-auto max-w-[9.5rem] md:h-7 md:max-w-[11.5rem]"
            : "h-6 w-auto max-w-[9.5rem] md:h-7 md:max-w-[11.5rem]"
        }
      />
    </Link>
  );
}
