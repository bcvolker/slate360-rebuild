import { clsx } from "clsx";

interface PageShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "blueprint" | "light" | "graphite" | "navy" | "dark";
  maxWidth?: "5xl" | "6xl" | "7xl" | "full";
}

const HEADER_OFFSET = "pt-24 md:pt-28"; // shared space below fixed header

export default function PageShell({ children, footer, variant = "light", maxWidth = "6xl" }: PageShellProps) {
  const bgClass =
    variant === "blueprint"
      ? "bg-blueprint"
      : variant === "graphite"
      ? "bg-graphite"
      : variant === "navy"
      ? "bg-grid-navy"
      : variant === "dark"
      ? "bg-grid-dark"
      : "bg-grid-light";

  const maxWidthClass =
    maxWidth === "full"
      ? "max-w-none"
      : maxWidth === "5xl"
      ? "max-w-5xl"
      : maxWidth === "6xl"
      ? "max-w-6xl"
      : "max-w-7xl";

  return (
    <div className={clsx("page-shell min-h-screen w-full flex flex-col justify-between", bgClass)}>
      <div className={clsx("page-shell-inner w-full mx-auto px-4 sm:px-6 lg:px-8 pb-24", HEADER_OFFSET, maxWidthClass)}>
        {children}
      </div>
      {footer}
    </div>
  );
}
