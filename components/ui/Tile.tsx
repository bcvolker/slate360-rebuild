import React from "react";
// import clsx from "clsx";

interface TileProps extends React.HTMLAttributes<HTMLDivElement> {
  surface?: "light" | "dark";
  children: React.ReactNode;
  className?: string;
}

function Tile({ surface = "light", children, className, ...props }: TileProps) {
  return (
    <section
      className={
        "tile-section " +
        (surface === "dark" ? "tile-surface-dark" : "tile-surface-light") +
        (className ? ` ${className}` : "")
      }
      {...props}
    >
      {children}
    </section>
  );
}
export default Tile;
