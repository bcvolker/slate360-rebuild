import { PROJECT_FOLDER_TAXONOMY } from "@/lib/slatedrop/folder-taxonomy";

export const PROJECT_CREATE_TOTAL_STEPS = 3;

export const PROJECT_CREATE_STEP_LABELS = ["Project details", "Invite team", "Confirm"] as const;

/** Top-level SlateDrop folders provisioned on project creation. */
export const PROJECT_CREATE_FOLDER_PREVIEW = PROJECT_FOLDER_TAXONOMY.map((folder) => ({
  id: folder.name,
  label: folder.name.replace(/_/g, " "),
}));

export type ProjectCreateFormState = {
  name: string;
  address: string;
  description: string;
  invites: string[];
};

export const emptyProjectCreateForm = (): ProjectCreateFormState => ({
  name: "",
  address: "",
  description: "",
  invites: [],
});
