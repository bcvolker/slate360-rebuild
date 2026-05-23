"use client";

import { UserPlus, Users } from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/lib/widgets/widget-meta";

type SeatMember = {
  name: string;
  role: string;
  email: string;
  active: boolean;
};

type Props = {
  span: string;
  widgetColor: string;
  widgetSize: WidgetSize;
  onSetSize?: (size: WidgetSize) => void;
  members: SeatMember[];
  maxSeats: number;
};

export default function DashboardSeatsWidget({
  span,
  widgetColor,
  widgetSize,
  onSetSize,
  members,
  maxSeats,
}: Props) {
  return (
    <WidgetCard
      icon={Users}
      title="Seat Management"
      span={span}
      delay={400}
      color={widgetColor}
      onSetSize={onSetSize}
      size={widgetSize}
      action={
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground transition-all hover:opacity-90"
          style={{ backgroundColor: "#3B82F6" }}
        >
          <UserPlus size={13} /> Invite member
        </button>
      }
    >
      <div>
        <div className="flex items-center gap-6 mb-5">
          <div>
            <p className="text-2xl font-black text-gray-900">{members.length}</p>
            <p className="text-[10px] text-gray-400 font-medium">of {maxSeats} seats used</p>
          </div>
          <div className="h-10 w-px bg-gray-100" />
          <div>
            <p className="text-2xl font-black text-emerald-600">{members.filter((member) => member.active).length}</p>
            <p className="text-[10px] text-gray-400 font-medium">Active now</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Name</th>
                <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Email</th>
                <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Role</th>
                <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4 text-xs font-semibold text-gray-900">{member.name}</td>
                  <td className="py-3 pr-4 text-xs text-gray-500">{member.email}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        member.role === "Owner"
                          ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                          : member.role === "Admin"
                            ? "bg-[#6366F1]/10 text-[#6366F1]"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`flex items-center gap-1.5 text-[10px] font-medium ${member.active ? "text-emerald-600" : "text-gray-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.active ? "bg-emerald-500" : "bg-gray-300"}`} />
                      {member.active ? "Online" : "Offline"}
                    </span>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-xs text-gray-400">
                    No seat members found for this organization
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WidgetCard>
  );
}