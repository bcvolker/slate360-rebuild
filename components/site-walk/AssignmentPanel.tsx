"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SiteWalkAssignment, AssignmentStatus } from "@/lib/types/site-walk";

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "Pending", icon: <Clock className="h-3 w-3" />, color: "text-muted-foreground" },
  acknowledged: { label: "Acknowledged", icon: <CheckCircle className="h-3 w-3" />, color: "text-blue-500" },
  in_progress: { label: "In Progress", icon: <Loader2 className="h-3 w-3" />, color: "text-amber-500" },
  done: { label: "Done", icon: <CheckCircle className="h-3 w-3" />, color: "text-green-500" },
  rejected: { label: "Rejected", icon: <AlertTriangle className="h-3 w-3" />, color: "text-red-500" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

type Props = {
  sessionId: string;
  currentUserId: string;
  orgMembers: { id: string; display_name: string }[];
};

export function AssignmentPanel({ sessionId, currentUserId, orgMembers }: Props) {
  const [assignments, setAssignments] = useState<SiteWalkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

  const fetchAssignments = useCallback(async () => {
    const res = await fetch(`/api/site-walk/assignments?session_id=${sessionId}`);
    if (res.ok) {
      const data = await res.json();
      setAssignments(data.assignments);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  async function handleCreate() {
    if (!title.trim() || !assignedTo) return;
    setCreating(true);
    try {
      const res = await fetch("/api/site-walk/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          assigned_to: assignedTo,
          title: title.trim(),
          priority,
        }),
      });
      if (res.ok) {
        const { assignment } = await res.json();
        setAssignments((prev) => [assignment, ...prev]);
        setTitle("");
        setAssignedTo("");
        setShowCreate(false);
      }
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: AssignmentStatus) {
    const res = await fetch(`/api/site-walk/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const { assignment } = await res.json();
      setAssignments((prev) => prev.map((a) => (a.id === id ? assignment : a)));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mine = assignments.filter((a) => a.assigned_to === currentUserId);
  const others = assignments.filter((a) => a.assigned_to !== currentUserId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Assignments</h3>
        <Button size="sm" variant="outline" onClick={() => setShowCreate((v) => !v)}>
          <UserPlus className="mr-1 h-3 w-3" /> Assign
        </Button>
      </div>

      {showCreate && (
        <Card className="space-y-3 p-3">
          <Input
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger>
            <SelectContent>
              {orgMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleCreate} disabled={!title.trim() || !assignedTo || creating}>
            {creating ? "Creating…" : "Create Assignment"}
          </Button>
        </Card>
      )}

      {assignments.length === 0 && !showCreate && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No assignments yet.
        </p>
      )}

      {mine.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Assigned to You</p>
          {mine.map((a) => (
            <AssignmentCard key={a.id} assignment={a} onStatusChange={updateStatus} isAssignee />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Other Assignments</p>
          {others.map((a) => (
            <AssignmentCard key={a.id} assignment={a} onStatusChange={updateStatus} isAssignee={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({
  assignment: a,
  onStatusChange,
  isAssignee,
}: {
  assignment: SiteWalkAssignment;
  onStatusChange: (id: string, status: AssignmentStatus) => void;
  isAssignee: boolean;
}) {
  const cfg = STATUS_CONFIG[a.status];
  return (
    <Card className="mb-2 flex items-center gap-3 p-3">
      <div className={`shrink-0 ${cfg.color}`}>{cfg.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{a.title}</p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${PRIORITY_COLORS[a.priority]}`}>
            {a.priority}
          </span>
          <span>{cfg.label}</span>
        </div>
      </div>
      {isAssignee && a.status === "pending" && (
        <Button size="sm" variant="outline" onClick={() => onStatusChange(a.id, "acknowledged")}>
          Ack
        </Button>
      )}
      {isAssignee && a.status === "acknowledged" && (
        <Button size="sm" variant="outline" onClick={() => onStatusChange(a.id, "in_progress")}>
          Start
        </Button>
      )}
      {isAssignee && a.status === "in_progress" && (
        <Button size="sm" onClick={() => onStatusChange(a.id, "done")}>
          Done
        </Button>
      )}
    </Card>
  );
}
