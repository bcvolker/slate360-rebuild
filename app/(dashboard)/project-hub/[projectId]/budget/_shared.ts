export type BudgetRow = {
  id: string; cost_code: string; description: string | null;
  budget_amount: number; spent_amount: number; category: string | null;
  change_order_amount: number; forecast_amount: number;
  notes: string | null; created_at: string; updated_at: string | null;
};
export type BudgetFormData = {
  costCode: string; description: string; budgetAmount: string;
  spentAmount: string; category: string; changeOrderAmount: string;
  forecastAmount: string; notes: string;
};

export const CATEGORIES = [
  "General Conditions","Site Work","Concrete","Masonry","Metals",
  "Wood & Plastics","Thermal & Moisture","Doors & Windows","Finishes",
  "Specialties","Equipment","Furnishings","Special Construction",
  "Conveying","Mechanical","Electrical","Contingency","Overhead & Profit",
];

export const CSI_TEMPLATES = [
  { costCode: "01-000", description: "General Conditions", category: "General Conditions" },
  { costCode: "02-000", description: "Site Work", category: "Site Work" },
  { costCode: "03-000", description: "Concrete", category: "Concrete" },
  { costCode: "04-000", description: "Masonry", category: "Masonry" },
  { costCode: "05-000", description: "Metals", category: "Metals" },
  { costCode: "06-000", description: "Wood & Plastics", category: "Wood & Plastics" },
  { costCode: "07-000", description: "Thermal & Moisture Protection", category: "Thermal & Moisture" },
  { costCode: "08-000", description: "Doors & Windows", category: "Doors & Windows" },
  { costCode: "09-000", description: "Finishes", category: "Finishes" },
  { costCode: "14-000", description: "Conveying Systems", category: "Conveying" },
  { costCode: "15-000", description: "Mechanical / HVAC / Plumbing", category: "Mechanical" },
  { costCode: "16-000", description: "Electrical", category: "Electrical" },
  { costCode: "01-900", description: "Contingency (5%)", category: "Contingency" },
  { costCode: "01-990", description: "Overhead & Profit", category: "Overhead & Profit" },
];

export const EMPTY_FORM: BudgetFormData = {
  costCode: "", description: "", budgetAmount: "0", spentAmount: "0",
  category: "", changeOrderAmount: "0", forecastAmount: "0", notes: "",
};

export function fmtCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
