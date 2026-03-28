/* Submittals shared types, constants & helpers */

export type Submittal = {
  id: string;
  title: string;
  spec_section: string | null;
  status: string;
  due_date: string | null;
  responsible_contractor: string | null;
  revision_number: number | null;
  lead_time_days: number | null;
  received_date: string | null;
  required_date: string | null;
  response_text: string | null;
  document_type: string | null;
  document_code: string | null;
  stakeholder_email: string | null;
  amount: number | null;
  version_number: number | null;
  sent_at: string | null;
  last_response_at: string | null;
  response_decision: string | null;
  created_at: string;
  updated_at: string | null;
};

export type SubmittalFormData = {
  title: string;
  spec_section: string;
  document_type: string;
  document_code: string;
  stakeholder_email: string;
  amount: string;
  version_number: string;
  status: string;
  due_date: string;
  responsible_contractor: string;
  revision_number: string;
  lead_time_days: string;
  received_date: string;
  required_date: string;
  response_text: string;
};

export const DOCUMENT_TYPES = [
  "Submittal", "Invoice", "Schedule of Values (SOV)", "Pay Application",
  "Change Order", "Lien Waiver", "AIA Contract", "AIA Payment Form",
  "AIA Admin Form", "Other",
] as const;

export const DOCUMENT_CODE_OPTIONS = [
  "A101 – Owner/Contractor Agreement (Stipulated Sum)",
  "A102 – Owner/Contractor Agreement (Cost Plus GMP)",
  "A103 – Owner/Contractor Agreement (Cost Plus, No GMP)",
  "A104 – Abbreviated Owner/Contractor Agreement",
  "A105 – Short Form Owner/Contractor Agreement",
  "A110 – Owner/Contractor Agreement (Custom Residential)",
  "A111 – Owner/Home Builder Agreement (Single Family)",
  "A112 – Owner/Home Builder Agreement (Design + Construction)",
  "A113 – Owner/Contractor Agreement (Single Family Remodel)",
  "A121 – Master Agreement Owner/Contractor (Multiple Work Orders)",
  "A132 – Owner/Contractor Agreement (CM as Advisor)",
  "A133 – Owner/CM as Constructor (Cost Plus GMP)",
  "A134 – Owner/CM as Constructor (Cost Plus, No GMP)",
  "A141 – Owner/Design-Builder Agreement",
  "A142 – Design-Builder/Contractor Agreement",
  "A145 – Abbreviated Owner/Design-Builder Agreement",
  "A151 – Owner/Vendor Agreement (FF&E, Stipulated Sum)",
  "A201 – General Conditions of the Contract for Construction",
  "A221 – Work Order (Master Agreement Owner/Contractor)",
  "A232 – General Conditions (CM as Advisor)",
  "A304 – Request for Contractor's Qualifications",
  "A305 – Contractor's Qualification Statement",
  "A310 – Bid Bond",
  "A312 – Payment Bond and Performance Bond",
  "A313 – Warranty Bond",
  "A401 – Contractor/Subcontractor Agreement",
  "A421 – Master Agreement Contractor/Subcontractor (Multiple Work Orders)",
  "A422 – Work Order (Master Agreement Contractor/Subcontractor)",
  "A441 – Contractor/Subcontractor Agreement (Design-Build)",
  "A701 – Instructions to Bidders",
  "A751 – Invitation and Instructions to Vendors (FF&E)",
  "B101 – Standard Owner/Architect Agreement",
  "B102 – Owner/Architect Agreement (Flexible Scope)",
  "B103 – Owner/Architect Agreement (Complex Project)",
  "B104 – Abbreviated Owner/Architect Agreement",
  "B105 – Short Form Owner/Architect Agreement",
  "B109 – Owner/Architect Agreement (Multi-Family / Mixed-Use)",
  "B110 – Owner/Architect Agreement (Custom Residential)",
  "B121 – Master Agreement Owner/Architect (Multiple Service Orders)",
  "B132 – Owner/Architect Agreement (CM as Advisor)",
  "B133 – Owner/Architect Agreement (CM as Constructor)",
  "B143 – Design-Builder/Architect Agreement",
  "B201 – Architect Services: Design & Construction Admin",
  "B202 – Architect Services: Programming",
  "B203 – Architect Services: Site Evaluation & Feasibility",
  "B205 – Architect Services: Historic Preservation",
  "B207 – Architect Services: On-Site Project Representation",
  "B221 – Service Order (Master Agreement Owner/Architect)",
  "B304 – Request for Architect's Qualifications",
  "B305 – Architect's Qualification Statement",
  "C101 – Joint Venture Agreement for Professional Services",
  "C103 – Owner/Consultant Agreement (Flexible Scope)",
  "C104 – Owner/Owner's Representative Agreement",
  "C132 – Owner/Construction Manager as Advisor",
  "C141 – Owner/Consultant Agreement (Design-Build)",
  "C171 – Owner/Program Manager Agreement",
  "C401 – Architect/Consultant Agreement",
  "C402 – Architect/Consultant Agreement (Special Services)",
  "C403 – Client/Consultant Agreement (Design Assist)",
  "C404 – Contractor/Consultant Agreement (Delegated Design)",
  "D101 – Methods of Calculating Areas and Volumes",
  "D200 – Project Checklist",
  "E201 – BIM Exhibit (Model Versions Enumerated)",
  "E202 – BIM Exhibit (Model Versions Not Enumerated)",
  "E204 – Sustainable Projects Exhibit",
  "E205 – Architects' Scope and Responsibility Matrix",
  "E234 – Sustainable Projects Exhibit (CM as Constructor)",
  "E401 – BIM Exhibit (Design Team)",
  "E402 – BIM Exhibit (Construction Team)",
  "F101 – Master Maintenance Agreement",
  "F102 – Maintenance Agreement (As-Needed Work)",
  "F103 – Maintenance Agreement (Ongoing Work)",
  "F201 – Work Order (As-Needed Maintenance)",
  "F202 – Work Order (Ongoing Maintenance)",
  "F301 – Client/Consultant Agreement (Facility)",
  "F311 – Consultant Services: Facility Condition Assessment",
  "F701 – Amendment to Maintenance Agreement or Work Order",
  "F703 – Request for Certificate of Insurance",
  "F704 – Status Report for Maintenance Work",
  "F706 – Request for Information (RFI) – Facility",
  "G203 – BIM Execution Plan",
  "G612 – Owner's Instructions to the Architect",
  "G701 – Change Order",
  "G701S – Change Order (Contractor-Subcontractor)",
  "G702 – Application and Certificate for Payment",
  "G702CW – Application for Payment (Cost of Work, No GMP)",
  "G702GMP – Application for Payment (Cost of Work, GMP)",
  "G702S – Application and Certificate for Payment (Subcontractor)",
  "G703 – Continuation Sheet / Schedule of Values (SOV)",
  "G703CW – Continuation Sheet (Cost of Work)",
  "G703S – Continuation Sheet (Contractor-Subcontractor)",
  "G704 – Certificate of Substantial Completion",
  "G705 – List of Subcontractors",
  "G706 – Contractor's Affidavit of Payment of Debts and Claims",
  "G706A – Contractor's Affidavit of Release of Liens",
  "G707 – Consent of Surety to Final Payment",
  "G709 – Proposal Request",
  "G710 – Architect's Supplemental Instructions",
  "G711 – Architect's Field Report",
  "G712 – Shop Drawing and Sample Record",
  "G714 – Construction Change Directive",
  "G715 – Supplemental Attachment for ACORD Certificate of Insurance",
  "G716 – Request for Information (RFI)",
  "G728 – Request for Evidence of Owner's Financial Arrangements",
  "G729 – Owner's Response to Request for Evidence of Financial Arrangements",
  "G731 – Change Order (CM as Advisor)",
  "G732 – Application and Certificate for Payment (CM as Advisor)",
  "G733 – Construction Change Directive (CM as Advisor)",
  "G734 – Certificate of Substantial Completion (CM as Advisor)",
  "G735 – Authorization to Proceed with Early Release Work",
  "G741 – Change Order (Design-Build)",
  "G742 – Application and Certificate for Payment (Design-Build)",
  "G743 – Continuation Sheet (Design-Build)",
  "G744 – Certificate of Substantial Completion (Design-Build)",
  "G745 – Change Directive (Design-Build)",
  "G801 – Notice of Additional Services",
  "G802 – Amendment to Professional Services Agreement",
  "G803 – Amendment to Consultant Services Agreement",
  "G804 – Register of Bid Documents",
  "G808 – Project Directory and Design Data Summary",
  "G810 – Transmittal Letter",
  "G901 – Conditional Waiver and Release on Progress Payment",
  "G901CA – California Conditional Waiver and Release on Progress Payment",
  "G901TX – Texas Conditional Waiver and Release on Progress Payment",
  "G902 – Unconditional Waiver and Release on Progress Payment",
  "G902CA – California Unconditional Waiver and Release on Progress Payment",
  "G902FL – Florida Waiver and Release of Lien Upon Progress Payment",
  "G902TX – Texas Unconditional Waiver and Release on Progress Payment",
  "G903 – Conditional Waiver and Release on Final Payment",
  "G903CA – California Conditional Waiver and Release on Final Payment",
  "G903TX – Texas Conditional Waiver and Release on Final Payment",
  "G904 – Unconditional Waiver and Release on Final Payment",
  "G904CA – California Unconditional Waiver and Release on Final Payment",
  "G904FL – Florida Waiver and Release of Lien Upon Final Payment",
  "G904TX – Texas Unconditional Waiver and Release on Final Payment",
  "G907 – Sworn Construction Statement",
  "Custom",
] as const;

export const STATUSES = ["Pending", "Submitted", "Approved", "Approved as Noted", "Revise and Resubmit", "Rejected", "Closed"];

export const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-zinc-800 text-zinc-300 border-zinc-700",
  Submitted: "bg-amber-950/40 text-amber-400 border-amber-900/50",
  Approved: "bg-emerald-950/40 text-emerald-400 border-emerald-900/50",
  "Approved as Noted": "bg-green-950/40 text-green-400 border-green-900/50",
  "Revise and Resubmit": "bg-orange-950/40 text-orange-400 border-orange-900/50",
  Rejected: "bg-red-950/40 text-red-400 border-red-900/50",
  Closed: "bg-blue-950/40 text-blue-400 border-blue-900/50",
};

export const EMPTY_FORM: SubmittalFormData = {
  title: "", spec_section: "", document_type: "Submittal", document_code: "",
  stakeholder_email: "", amount: "0", version_number: "1", status: "Pending",
  due_date: "", responsible_contractor: "", revision_number: "0",
  lead_time_days: "", received_date: "", required_date: "", response_text: "",
};
