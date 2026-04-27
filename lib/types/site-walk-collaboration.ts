export type SiteWalkComment = {
  id: string;
  org_id: string;
  project_id: string | null;
  session_id: string;
  item_id: string | null;
  parent_id: string | null;
  author_id: string;
  body: string;
  is_field: boolean;
  read_by: string[];
  is_escalation: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateCommentPayload = {
  session_id: string;
  item_id?: string;
  parent_id?: string;
  body: string;
  is_field?: boolean;
  is_escalation?: boolean;
};

export type AssignmentPriority = "low" | "medium" | "high" | "critical";
export type AssignmentStatus =
  | "pending"
  | "acknowledged"
  | "in_progress"
  | "done"
  | "rejected";

export type SiteWalkAssignment = {
  id: string;
  org_id: string;
  project_id: string | null;
  session_id: string;
  item_id: string | null;
  assigned_by: string;
  assigned_to: string;
  title: string;
  description: string | null;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  due_date: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateAssignmentPayload = {
  session_id: string;
  item_id?: string;
  assigned_to: string;
  title: string;
  description?: string;
  priority?: AssignmentPriority;
  due_date?: string;
};

export type UpdateAssignmentPayload = {
  title?: string;
  description?: string;
  priority?: AssignmentPriority;
  status?: AssignmentStatus;
  due_date?: string;
};
