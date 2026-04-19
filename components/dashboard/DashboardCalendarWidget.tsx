"use client";

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/lib/widgets/widget-meta";

type CalendarCell = {
  day: number;
  inMonth: boolean;
  dateStr: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  color: string;
  project?: string;
};

type Props = {
  span: string;
  widgetColor: string;
  widgetSize: WidgetSize;
  onSetSize?: (size: WidgetSize) => void;
  month: number;
  year: number;
  calDays: CalendarCell[];
  todayStr: string;
  selectedDate: string | null;
  events: CalendarEvent[];
  selectedDayEvents: CalendarEvent[];
  addingEvent: boolean;
  newEventTitle: string;
  isClient: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateStr: string) => void;
  onStartAddEvent: () => void;
  onTitleChange: (value: string) => void;
  onAddEvent: () => void;
  onCancelAddEvent: () => void;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DashboardCalendarWidget({
  span,
  widgetColor,
  widgetSize,
  onSetSize,
  month,
  year,
  calDays,
  todayStr,
  selectedDate,
  events,
  selectedDayEvents,
  addingEvent,
  newEventTitle,
  isClient,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onStartAddEvent,
  onTitleChange,
  onAddEvent,
  onCancelAddEvent,
}: Props) {
  return (
    <WidgetCard
      icon={CalendarIcon}
      title="Calendar"
      span={span}
      delay={150}
      color={widgetColor}
      onSetSize={onSetSize}
      size={widgetSize}
      action={
        <button
          onClick={onStartAddEvent}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#F59E0B] hover:underline"
        >
          <Plus size={13} /> Add event
        </button>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-900">
              {MONTHS[month]} {year}
            </h4>
            <div className="flex gap-1">
              <button
                onClick={onPrevMonth}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={onNextMonth}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-[10px] text-gray-400 font-semibold py-2">
                {day}
              </div>
            ))}
            {calDays.map((cell, index) => {
              const hasEvents = events.some((event) => event.date === cell.dateStr);
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;

              return (
                <button
                  key={index}
                  onClick={() => onSelectDate(cell.dateStr)}
                  className={`relative h-9 rounded-lg text-xs font-medium transition-all
                    ${!cell.inMonth ? "text-gray-300" : "text-gray-700 hover:bg-gray-100"}
                    ${isToday && !isSelected ? "bg-[#F59E0B]/10 text-[#F59E0B] font-bold" : ""}
                    ${isSelected ? "bg-[#F59E0B] text-white font-bold shadow-sm" : ""}
                  `}
                >
                  {cell.day}
                  {hasEvents && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#F59E0B]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:w-64 lg:border-l lg:border-gray-100 lg:pl-6">
          <h4 className="text-xs font-bold text-gray-900 mb-3">
            {isClient && selectedDate
              ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })
              : "Upcoming events"}
          </h4>

          {addingEvent && selectedDate && (
            <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <input
                type="text"
                placeholder="Event title…"
                value={newEventTitle}
                onChange={(event) => onTitleChange(event.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={onAddEvent}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg text-white"
                  style={{ backgroundColor: "#F59E0B" }}
                >
                  Add
                </button>
                <button
                  onClick={onCancelAddEvent}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2.5 max-h-[240px] overflow-y-auto">
            {(selectedDate ? selectedDayEvents : events.slice(0, 5)).map((event) => (
              <div key={event.id} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: event.color }} />
                <div>
                  <p className="text-xs font-semibold text-gray-900 leading-snug">{event.title}</p>
                  <p className="text-[10px] text-gray-400">
                    {isClient
                      ? new Date(event.date + "T12:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                    {event.project && ` · ${event.project}`}
                  </p>
                </div>
              </div>
            ))}
            {selectedDate && selectedDayEvents.length === 0 && !addingEvent && (
              <p className="text-xs text-gray-400 py-4 text-center">No events this day</p>
            )}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}