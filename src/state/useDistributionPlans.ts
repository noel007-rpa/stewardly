import { useEffect, useState } from "react";
import type { DistributionPlan } from "../types/distribution";
import { listPlans, subscribePlans } from "./distributionPlansStore";

export function useDistributionPlans(): DistributionPlan[] {
  const [plans, setPlans] = useState<DistributionPlan[]>(() => listPlans());

  useEffect(() => {
    return subscribePlans(() => {
      setPlans(listPlans());
    });
  }, []);

  return plans;
}
