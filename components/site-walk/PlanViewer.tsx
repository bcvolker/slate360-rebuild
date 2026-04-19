"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SiteWalkPlan, SiteWalkPin, SiteWalkItem, PinColor } from "@/lib/types/site-walk";

const PIN_COLORS: Record<PinColor, string> = {
  blue: "fill-blue-500",
  green: "fill-green-500",
  amber: "fill-amber-500",
  red: "fill-red-500",
  gray: "fill-gray-400",
  purple: "fill-purple-500",
};

const STATUS_TO_PIN: Record<string, PinColor> = {
  open: "blue",
  in_progress: "amber",
  resolved: "green",
  verified: "green",
  closed: "gray",
  na: "gray",
};

type Props = {
  plan: SiteWalkPlan;
  items: SiteWalkItem[];
  onPinCreate: (planId: string, itemId: string, x: number, y: number, color: PinColor) => Promise<void>;
  onPinDelete: (pinId: string) => Promise<void>;
  placingItemId: string | null;
};

export function PlanViewer({ plan, items, onPinCreate, onPinDelete, placingItemId }: Props) {
  const [pins, setPins] = useState<SiteWalkPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  const fetchPins = useCallback(async () => {
    const res = await fetch(`/api/site-walk/pins?plan_id=${plan.id}`);
    if (res.ok) {
      const data = await res.json();
      setPins(data.pins);
    }
    setLoading(false);
  }, [plan.id]);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  async function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!placingItemId || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    const item = items.find((i) => i.id === placingItemId);
    const color = item ? STATUS_TO_PIN[item.item_status] ?? "blue" : "blue";

    await onPinCreate(plan.id, placingItemId, xPct, yPct, color);
    await fetchPins();
  }

  async function handleDeletePin(pinId: string) {
    await onPinDelete(pinId);
    setPins((prev) => prev.filter((p) => p.id !== pinId));
    setSelectedPin(null);
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-sm font-medium">{plan.title}</p>
        {placingItemId && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <MapPin className="h-3 w-3" /> Click to place pin
          </span>
        )}
      </div>
      <div
        ref={imgRef}
        className="relative cursor-crosshair select-none"
        style={{ aspectRatio: plan.width && plan.height ? `${plan.width}/${plan.height}` : "16/9" }}
        onClick={handleImageClick}
      >
        {/* Plan image */}
        <img
          src={`/api/site-walk/plans/${plan.id}/image`}
          alt={plan.title}
          className="h-full w-full object-contain"
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Pin overlay */}
        {pins.map((pin, idx) => {
          const item = items.find((i) => i.id === pin.item_id);
          return (
            <button
              key={pin.id}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPin(selectedPin === pin.id ? null : pin.id);
              }}
              title={item?.title ?? `Pin ${idx + 1}`}
            >
              <svg width="24" height="32" viewBox="0 0 24 32">
                <path
                  d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"
                  className={PIN_COLORS[pin.pin_color]}
                />
                <text x="12" y="15" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                  {pin.pin_number ?? idx + 1}
                </text>
              </svg>
            </button>
          );
        })}

        {/* Selected pin tooltip */}
        {selectedPin && (() => {
          const pin = pins.find((p) => p.id === selectedPin);
          if (!pin) return null;
          const item = items.find((i) => i.id === pin.item_id);
          return (
            <div
              className="absolute z-10 -translate-x-1/2 rounded border bg-white p-2 shadow-md dark:bg-app-card"
              style={{ left: `${pin.x_pct}%`, top: `${Math.max(0, pin.y_pct - 3)}%` }}
            >
              <p className="text-xs font-medium">{item?.title ?? "Unknown item"}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{item?.item_status ?? ""}</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 h-6 text-xs text-destructive"
                onClick={(e) => { e.stopPropagation(); handleDeletePin(pin.id); }}
              >
                <Trash2 className="mr-1 h-3 w-3" /> Remove
              </Button>
            </div>
          );
        })()}
      </div>
    </Card>
  );
}
