/**
 * useProjectProfile — shared autofill hook
 *
 * Fetches project metadata from the API and merges it with
 * the user's company profile stored in localStorage.  Any form
 * that needs autofill can call this hook to get pre-populated
 * defaults.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export interface CompanyProfile {
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  companyPhone: string;
  companyEmail: string;
  licenseNumber: string;
  contactName: string;
}

export interface ProjectProfile {
  projectId: string;
  projectName: string;
  projectAddress: string;
  projectCity: string;
  projectState: string;
  projectZip: string;
  ownerName: string;
  architectName: string;
  contractorName: string;
  contractDate: string;
  contractAmount: string;
}

export interface AutofillProfile {
  company: CompanyProfile;
  project: ProjectProfile;
  ready: boolean;
  saveCompany: (profile: CompanyProfile) => void;
}

const COMPANY_KEY = "slate360-company-profile-v1";

const DEFAULT_COMPANY: CompanyProfile = {
  companyName: "",
  companyAddress: "",
  companyCity: "",
  companyState: "",
  companyZip: "",
  companyPhone: "",
  companyEmail: "",
  licenseNumber: "",
  contactName: "",
};

const DEFAULT_PROJECT: ProjectProfile = {
  projectId: "",
  projectName: "",
  projectAddress: "",
  projectCity: "",
  projectState: "",
  projectZip: "",
  ownerName: "",
  architectName: "",
  contractorName: "",
  contractDate: "",
  contractAmount: "",
};

function loadCompany(): CompanyProfile {
  if (typeof window === "undefined") return DEFAULT_COMPANY;
  try {
    const raw = localStorage.getItem(COMPANY_KEY);
    if (!raw) return DEFAULT_COMPANY;
    return { ...DEFAULT_COMPANY, ...(JSON.parse(raw) as Partial<CompanyProfile>) };
  } catch {
    return DEFAULT_COMPANY;
  }
}

export function useProjectProfile(projectId: string | undefined): AutofillProfile {
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [project, setProject] = useState<ProjectProfile>(DEFAULT_PROJECT);
  const [ready, setReady] = useState(false);

  // Load company profile from localStorage on mount
  useEffect(() => {
    setCompany(loadCompany());
  }, []);

  // Fetch project metadata from API
  useEffect(() => {
    if (!projectId) return;
    void fetch(`/api/projects/${projectId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { project?: Record<string, unknown> }) => {
        const p = data.project as Record<string, unknown> | undefined;
        if (!p) return;
        const meta = (p.metadata ?? {}) as Record<string, unknown>;
        setProject({
          projectId,
          projectName: String(p.name ?? ""),
          projectAddress: String(meta.address ?? meta.location ?? ""),
          projectCity: String(meta.city ?? ""),
          projectState: String(meta.state ?? ""),
          projectZip: String(meta.zip ?? ""),
          ownerName: String(meta.owner_name ?? ""),
          architectName: String(meta.architect_name ?? ""),
          contractorName: String(meta.contractor_name ?? ""),
          contractDate: String(meta.contract_date ?? ""),
          contractAmount: String(meta.contract_amount ?? ""),
        });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [projectId]);

  const saveCompany = useCallback((profile: CompanyProfile) => {
    setCompany(profile);
    if (typeof window !== "undefined") {
      localStorage.setItem(COMPANY_KEY, JSON.stringify(profile));
    }
  }, []);

  return { company, project, ready, saveCompany };
}
