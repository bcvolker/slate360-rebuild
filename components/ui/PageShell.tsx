import { clsx } from "clsx";

interface PageShellProps {
  children: React.ReactNode;
  variant?: "blueprint" | "light" | "graphite" | "navy" | "dark";
  maxWidth?: "3xl" | "5xl" | "6xl" | "7xl" | "full";
  className?: string;
}

// Pure content wrapper: background, padding, max-width only.
// Overall page height and footer are controlled by `app/layout.tsx`.
export default function PageShell({
  children,
  variant = "light",
  maxWidth = "6xl",
  className,
}: PageShellProps) {
  const bgClass =
    variant === "graphite"
      ? "bg-graphite"
      : variant === "blueprint"
      ? "bg-blueprint"
      : variant === "navy"
      ? "bg-grid-navy"
      : variant === "dark"
      ? "bg-grid-dark"
      : "bg-grid-light";

  const maxWidthClass =
    maxWidth === "full"
      ? "max-w-none"
      : maxWidth === "3xl"
      ? "max-w-3xl"
      : maxWidth === "5xl"
      ? "max-w-5xl"
      : maxWidth === "6xl"
      ? "max-w-6xl"
      : "max-w-7xl";

  return (
    <div
      className={clsx(
        "w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 pt-24 pb-12",
        bgClass,
        className
      )}
    >
      <section
        className={clsx(
          "w-full min-h-[60vh] text-slate-800",
          !className?.includes("p-0") &&
            "rounded-2xl border border-white/50 bg-orange-50/90 backdrop-blur-md shadow-sm p-8 md:p-12",
          maxWidthClass
        )}
      >
        {children}
      </section>
    </div>
  );
}
