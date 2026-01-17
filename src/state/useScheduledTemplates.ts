import { useState, useEffect } from "react";
import type { ScheduledTransactionTemplate } from "../types/scheduled";
import { subscribeScheduledTemplates, listScheduledTemplates } from "../state/scheduledTemplatesStore";

/**
 * Hook to get scheduled transaction templates with reactive updates
 */
export function useScheduledTemplates(): ScheduledTransactionTemplate[] {
  const [templates, setTemplates] = useState<ScheduledTransactionTemplate[]>(() =>
    listScheduledTemplates()
  );

  useEffect(() => {
    const unsubscribe = subscribeScheduledTemplates(() => {
      setTemplates(listScheduledTemplates());
    });
    return () => unsubscribe();
  }, []);

  return templates;
}
