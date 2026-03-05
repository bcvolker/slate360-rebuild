import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function HelpTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-300 text-gray-700 text-[10px] cursor-help ml-1 select-none">?</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-green-100 text-green-700 border border-green-200",
    closed: "bg-gray-200 text-gray-500",
    paper: "bg-purple-100 text-purple-700 border border-purple-200",
    connected: "bg-green-100 text-green-700 border border-green-200",
    disconnected: "bg-gray-200 text-gray-500",
    running: "bg-orange-100 text-orange-700 border border-orange-200",
    idle: "bg-gray-200 text-gray-500",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.idle}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
