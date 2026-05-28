import { MobileCalendarClient } from "@/components/mobile-system/MobileCalendarClient";

export const metadata = { title: "Calendar — Slate360" };
export const dynamic = "force-dynamic";

export default function CoordinationCalendarPage() {
  return <MobileCalendarClient />;
}
