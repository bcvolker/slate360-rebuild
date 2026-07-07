export type ThermalV2Tab = "library" | "analyze" | "ai-review" | "report" | "deliver";

export type ThermalV2ScopeKind = "image" | "selected" | "all";

export type ThermalV2Scope =
  | { kind: "image" }
  | { kind: "selected"; count: number }
  | { kind: "all"; count: number };

export type ThermalV2Capture = {
  id: string;
  filename: string;
  selected?: boolean;
};
