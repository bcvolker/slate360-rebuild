import { PROJECT_FOLDER_TAXONOMY } from "@/lib/slatedrop/folder-taxonomy";

// Collaborators are added in project management, not at creation. Creation is a
// focused 2-step flow: comprehensive project details -> confirm.
export const PROJECT_CREATE_TOTAL_STEPS = 2;

export const PROJECT_CREATE_STEP_LABELS = ["Project details", "Confirm"] as const;

/** Top-level SlateDrop folders provisioned on project creation. */
export const PROJECT_CREATE_FOLDER_PREVIEW = PROJECT_FOLDER_TAXONOMY.map((folder) => ({
  id: folder.name,
  label: folder.name.replace(/_/g, " "),
}));

/** Building / work type — the "what" of the project. */
export const PROJECT_TYPE_OPTIONS = [
  "Commercial",
  "Residential",
  "Industrial",
  "Roofing",
  "Civil / Infrastructure",
  "Institutional",
  "Inspection",
  "Other",
] as const;

export type ProjectCreateFormState = {
  /** What */
  name: string;
  projectType: string;
  scope: string;
  /** Who */
  client: string;
  /** Where */
  address: string;
  /** When */
  startDate: string;
  targetDate: string;
  /** Construction detail (optional) */
  squareFootage: string;
};

export const emptyProjectCreateForm = (): ProjectCreateFormState => ({
  name: "",
  projectType: "",
  scope: "",
  client: "",
  address: "",
  startDate: "",
  targetDate: "",
  squareFootage: "",
});
