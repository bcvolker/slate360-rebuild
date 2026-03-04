"use client";

import { Search, UserPlus, Users } from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/components/widgets/widget-meta";

type Contact = {
  name: string;
  role: string;
  project: string;
  initials: string;
  color: string;
};

type Props = {
  span: string;
  widgetColor: string;
  widgetSize: WidgetSize;
  onSetSize?: (size: WidgetSize) => void;
  contactSearch: string;
  filteredContacts: Contact[];
  onContactSearchChange: (value: string) => void;
};

export default function DashboardContactsWidget({
  span,
  widgetColor,
  widgetSize,
  onSetSize,
  contactSearch,
  filteredContacts,
  onContactSearchChange,
}: Props) {
  return (
    <WidgetCard
      icon={Users}
      title="Contacts"
      span={span}
      delay={300}
      color={widgetColor}
      onSetSize={onSetSize}
      size={widgetSize}
      action={
        <button className="text-[11px] font-semibold text-[#FF4D00] hover:underline flex items-center gap-0.5">
          <UserPlus size={12} /> Add
        </button>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts…"
            value={contactSearch}
            onChange={(event) => onContactSearchChange(event.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
          />
        </div>
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {filteredContacts.map((contact) => (
            <button
              key={contact.name}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: contact.color }}
              >
                {contact.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{contact.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{contact.role}</p>
              </div>
              <span className="text-[9px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{contact.project}</span>
            </button>
          ))}
          {filteredContacts.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No contacts found</p>}
        </div>
      </div>
    </WidgetCard>
  );
}