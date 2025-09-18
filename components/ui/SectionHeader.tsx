import React from "react";
import clsx from "clsx";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, className }) => (
  <div className={clsx("mb-8 text-center", className)}>
    <h2 className="responsive-title">{title}</h2>
    {subtitle && <p className="responsive-subtitle">{subtitle}</p>}
  </div>
);

export default SectionHeader;
