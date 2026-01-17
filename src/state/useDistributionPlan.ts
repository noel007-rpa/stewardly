import { useEffect, useState } from "react";
import { getDistributionPlan, subscribePlans } from "./distributionPlansStore";
import type { DistributionPlan } from "../types/distribution";

export function useDistributionPlan(): DistributionPlan | null {
  const [plan, setPlan] = useState<DistributionPlan | null>(() => getDistributionPlan());

  useEffect(() => {
    return subscribePlans(() => {
      setPlan(getDistributionPlan());
    });
  }, []);

  return plan;
}
