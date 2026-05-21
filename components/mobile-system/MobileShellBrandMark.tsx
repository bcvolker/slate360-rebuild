"use client";

import { MobileShellBrand } from "./MobileShellBrand";

type MobileShellBrandMarkProps = {
  href?: string;
  className?: string;
  iconClassName?: string;
};

/** @deprecated Use MobileShellBrand — icon-only alias for legacy imports */
export function MobileShellBrandMark({
  href = "/app",
  className,
  iconClassName,
}: MobileShellBrandMarkProps) {
  return (
    <MobileShellBrand
      href={href}
      className={className}
      iconClassName={iconClassName}
      iconOnly
    />
  );
}
