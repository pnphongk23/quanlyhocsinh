import { useEffect, useState } from "react";
import type { CriteriaSet } from "../../data/api/types";
import { getCachedCriteriaSet, getCriteriaSet } from "../../data/repositories/criteriaSet";

export function useCriteriaSet(enabled: boolean): CriteriaSet | null {
  const [criteriaSet, setCriteriaSet] = useState<CriteriaSet | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void getCachedCriteriaSet().then(async (cached) => {
      if (!active) return;
      if (cached) setCriteriaSet(cached);
      else if (typeof navigator === "undefined" || navigator.onLine) {
        try {
          const fresh = await getCriteriaSet();
          if (active) setCriteriaSet(fresh);
        } catch {
          // Keep the last cached workspace set when network refresh is unavailable.
        }
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [enabled]);
  return criteriaSet;
}
