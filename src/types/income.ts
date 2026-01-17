export type IncomeFrequency = "oneTime" | "monthly" | "yearly";
export type IncomeStatus = "active" | "paused";

export type IncomeRecord = {
  id: string;
  date: string; // ISO YYYY-MM-DD (date received OR created)
  name: string;
  amount: number;
  currency: string; // e.g. "SGD"
  frequency: IncomeFrequency;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  note?: string;
  status: IncomeStatus;
  monthlyPayRule?: "dayOfMonth" | "endOfMonth"; // Only relevant for monthly frequency
  monthlyPayDay?: number; // 1-31, used only if monthlyPayRule === "dayOfMonth"
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type IncomeInput = Omit<IncomeRecord, "id" | "createdAt" | "updatedAt">;
