/* ─── Management page shared types & constants ──────────────── */

export type Stakeholder = {
  id: string; name: string; role: string; company: string | null;
  email: string | null; phone: string | null; address: string | null;
  license_no: string | null; notes: string | null; status: string; created_at: string;
};

export type Contract = {
  id: string; title: string; contract_type: string | null; parties: string | null;
  executed_date: string | null; contract_value: number | null; status: string;
  summary: string | null; key_requirements: string | null; file_url: string | null;
  file_upload_id: string | null; notes: string | null; created_at: string;
};

export type Tab = "stakeholders" | "contracts" | "reports";

export const ROLES = ["Owner","Architect","General Contractor","Subcontractor","Engineer","Inspector","Surveyor","Material Supplier","Legal Counsel","Other"];
export const CONTRACT_TYPES = ["AIA A101 – Stipulated Sum","AIA A102 – Cost Plus GMP","AIA A104 – Abbreviated","AIA A201 – General Conditions","Subcontract","GMP Agreement","Lump Sum","Time & Material","Purchase Order","Professional Services","Other"];
export const CONTRACT_STATUSES = ["Draft","Executed","Expired","Terminated","Under Review"];
export const REPORT_TYPES = ["Project Status","Weekly Progress","Monthly Executive","Budget Summary","Schedule Update","Punch List","Stakeholder Summary","Closeout Report"];
export const SECTIONS_OPTIONS = [
  { id: "schedule",   label: "Schedule / Gantt" },
  { id: "budget",     label: "Budget & Financials" },
  { id: "rfis",       label: "RFIs" },
  { id: "submittals", label: "Submittals & Documents" },
  { id: "daily-logs", label: "Daily Logs" },
  { id: "punch-list", label: "Punch List" },
];

export const ROLE_COLORS: Record<string, string> = {
  "Owner":              "bg-blue-100 text-blue-700 border-blue-200",
  "Architect":          "bg-purple-100 text-purple-700 border-purple-200",
  "General Contractor": "bg-orange-100 text-orange-700 border-orange-200",
  "Subcontractor":      "bg-amber-100 text-amber-700 border-amber-200",
  "Engineer":           "bg-teal-100 text-teal-700 border-teal-200",
  "Inspector":          "bg-red-100 text-red-700 border-red-200",
  "Surveyor":           "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Material Supplier":  "bg-green-100 text-green-700 border-green-200",
  "Legal Counsel":      "bg-slate-100 text-slate-700 border-slate-200",
  "Other":              "bg-gray-100 text-gray-600 border-gray-200",
};

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  Draft:          "bg-gray-100 text-gray-600 border-gray-200",
  Executed:       "bg-emerald-100 text-emerald-700 border-emerald-200",
  Expired:        "bg-red-100 text-red-700 border-red-200",
  Terminated:     "bg-red-100 text-red-800 border-red-300",
  "Under Review": "bg-amber-100 text-amber-700 border-amber-200",
};

export const EMPTY_S_FORM = { name:"", role:"Owner", company:"", email:"", phone:"", address:"", license_no:"", notes:"", status:"Active" };
export const EMPTY_C_FORM = { title:"", contract_type:"", parties:"", executed_date:"", contract_value:"", status:"Draft", notes:"" };
