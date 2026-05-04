// Shared types for the Contacts CRM — imported by all sub-components.

export type ContactProject = {
  project_id: string;
  projects: { id: string; name: string } | null;
};

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  notes: string | null;
  initials: string | null;
  color: string | null;
  tags: string[];
  contact_projects?: ContactProject[];
};
