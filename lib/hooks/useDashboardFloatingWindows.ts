import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Point = { x: number; y: number };
type Size = { w: number; h: number };
type DragMode = "title" | "resize" | null;

type DragStart = {
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
};

const INITIAL_SLATEDROP_SIZE: Size = { w: 1000, h: 680 };
const INITIAL_WIDGET_SIZE: Size = { w: 900, h: 640 };

export function useDashboardFloatingWindows() {
  const [slateDropOpen, setSlateDropOpen] = useState(false);
  const [sdMinimized, setSdMinimized] = useState(false);
  const [sdPos, setSdPos] = useState<Point>({ x: 0, y: 0 });
  const [sdSize, setSdSize] = useState<Size>(INITIAL_SLATEDROP_SIZE);
  const [sdIsMobile, setSdIsMobile] = useState(false);
  const sdDragMode = useRef<DragMode>(null);
  const sdDragStart = useRef<DragStart>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
  });

  const [widgetPopoutId, setWidgetPopoutId] = useState<string | null>(null);
  const [wdMinimized, setWdMinimized] = useState(false);
  const [wdPos, setWdPos] = useState<Point>({ x: 0, y: 0 });
  const [wdSize, setWdSize] = useState<Size>(INITIAL_WIDGET_SIZE);
  const [wdIsMobile, setWdIsMobile] = useState(false);
  const wdDragMode = useRef<DragMode>(null);
  const wdDragStart = useRef<DragStart>({
    clientX: 0,
    clientY: 0,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
  });

  const openSlateDrop = () => {
    const isMobile = window.innerWidth < 768;
    setSdIsMobile(isMobile);
    if (isMobile) {
      setSdPos({ x: 0, y: 0 });
      setSdSize({ w: window.innerWidth, h: window.innerHeight });
      setSdMinimized(false);
      setSlateDropOpen(true);
      return;
    }
    setSdPos({
      x: Math.max(0, (window.innerWidth - INITIAL_SLATEDROP_SIZE.w) / 2),
      y: Math.max(10, (window.innerHeight - INITIAL_SLATEDROP_SIZE.h) / 4),
    });
    setSdSize(INITIAL_SLATEDROP_SIZE);
    setSdMinimized(false);
    setSlateDropOpen(true);
  };

  const onSdTitleDown = (event: ReactPointerEvent) => {
    sdDragMode.current = "title";
    sdDragStart.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      startX: sdPos.x,
      startY: sdPos.y,
      startW: sdSize.w,
      startH: sdSize.h,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onSdResizeDown = (event: ReactPointerEvent) => {
    sdDragMode.current = "resize";
    sdDragStart.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      startX: sdPos.x,
      startY: sdPos.y,
      startW: sdSize.w,
      startH: sdSize.h,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.stopPropagation();
  };

  const onSdPointerMove = (event: ReactPointerEvent) => {
    if (!sdDragMode.current) return;
    const dx = event.clientX - sdDragStart.current.clientX;
    const dy = event.clientY - sdDragStart.current.clientY;
    if (sdDragMode.current === "title") {
      setSdPos({ x: sdDragStart.current.startX + dx, y: sdDragStart.current.startY + dy });
    } else {
      setSdSize({
        w: Math.max(560, sdDragStart.current.startW + dx),
        h: Math.max(420, sdDragStart.current.startH + dy),
      });
    }
  };

  const onSdPointerUp = () => {
    sdDragMode.current = null;
  };

  const openWidgetPopout = (widgetId: string) => {
    const isMobile = window.innerWidth < 768;
    setWdIsMobile(isMobile);
    if (isMobile) {
      setWdPos({ x: 0, y: 0 });
      setWdSize({ w: window.innerWidth, h: window.innerHeight });
      setWdMinimized(false);
      setWidgetPopoutId(widgetId);
      return;
    }
    setWdPos({
      x: Math.max(0, (window.innerWidth - INITIAL_WIDGET_SIZE.w) / 2),
      y: Math.max(10, (window.innerHeight - INITIAL_WIDGET_SIZE.h) / 4),
    });
    setWdSize(INITIAL_WIDGET_SIZE);
    setWdMinimized(false);
    setWidgetPopoutId(widgetId);
  };

  const onWdTitleDown = (event: ReactPointerEvent) => {
    wdDragMode.current = "title";
    wdDragStart.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      startX: wdPos.x,
      startY: wdPos.y,
      startW: wdSize.w,
      startH: wdSize.h,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onWdResizeDown = (event: ReactPointerEvent) => {
    wdDragMode.current = "resize";
    wdDragStart.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      startX: wdPos.x,
      startY: wdPos.y,
      startW: wdSize.w,
      startH: wdSize.h,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.stopPropagation();
  };

  const onWdPointerMove = (event: ReactPointerEvent) => {
    if (!wdDragMode.current) return;
    const dx = event.clientX - wdDragStart.current.clientX;
    const dy = event.clientY - wdDragStart.current.clientY;
    if (wdDragMode.current === "title") {
      setWdPos({ x: wdDragStart.current.startX + dx, y: wdDragStart.current.startY + dy });
    } else {
      setWdSize({
        w: Math.max(560, wdDragStart.current.startW + dx),
        h: Math.max(420, wdDragStart.current.startH + dy),
      });
    }
  };

  const onWdPointerUp = () => {
    wdDragMode.current = null;
  };

  return {
    slateDropOpen,
    setSlateDropOpen,
    sdMinimized,
    setSdMinimized,
    sdPos,
    setSdPos,
    sdSize,
    setSdSize,
    sdIsMobile,
    openSlateDrop,
    onSdTitleDown,
    onSdResizeDown,
    onSdPointerMove,
    onSdPointerUp,
    widgetPopoutId,
    setWidgetPopoutId,
    wdMinimized,
    setWdMinimized,
    wdPos,
    setWdPos,
    wdSize,
    setWdSize,
    wdIsMobile,
    openWidgetPopout,
    onWdTitleDown,
    onWdResizeDown,
    onWdPointerMove,
    onWdPointerUp,
  };
}
