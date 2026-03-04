import { MapPin } from "lucide-react";

type LocationDisplayProps = {
  label?: string | null;
  iconSize?: number;
  className?: string;
  textClassName?: string;
};

export default function LocationDisplay({
  label,
  iconSize = 10,
  className = "flex items-center gap-1",
  textClassName = "text-[10px] text-gray-500",
}: LocationDisplayProps) {
  if (!label || !label.trim()) return null;

  return (
    <p className={`${className} ${textClassName}`}>
      <MapPin size={iconSize} />
      {label}
    </p>
  );
}
