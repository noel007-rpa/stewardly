export type Household = {
  household_id: string;
  name: string;
  base_currency: string;
  role: string;
};

const HOUSEHOLD_ID_KEY = "stewardly_household_id";

type HouseholdState = {
  households: Household[];
  selectedHouseholdId: string | null;
};

let memoryState: HouseholdState = {
  households: [],
  selectedHouseholdId: localStorage.getItem(HOUSEHOLD_ID_KEY),
};

export function getHouseholdState(): HouseholdState {
  return memoryState;
}

export function setHouseholds(households: Household[]) {
  memoryState = { ...memoryState, households };

  // Auto-select the first household if none is selected yet
  if (!memoryState.selectedHouseholdId && households.length > 0) {
    setSelectedHouseholdId(households[0].household_id);
  }
}

export function setSelectedHouseholdId(id: string | null) {
  memoryState = { ...memoryState, selectedHouseholdId: id };

  if (id) localStorage.setItem(HOUSEHOLD_ID_KEY, id);
  else localStorage.removeItem(HOUSEHOLD_ID_KEY);
}
