import { useEffect, useEffectEvent, useState } from "react";

import { ACTIVITY_SEARCH_DEBOUNCE_MS } from "@/features/activity/activity.constants";
import type { ISearchDraftInput } from "@/features/activity/components/ActivityFilters/ActivityFilters.interfaces";

export function useSearchDraft({ committed, onCommit }: ISearchDraftInput) {
  const [draft, setDraft] = useState(committed ?? "");
  const commit = useEffectEvent((text: string) => {
    const trimmed = text.trim();
    if (trimmed === (committed ?? "")) {
      return;
    }
    onCommit(trimmed || undefined);
  });

  useEffect(() => {
    const timer = setTimeout(() => commit(draft), ACTIVITY_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    setDraft(committed ?? "");
  }, [committed]);

  return { draft, setDraft };
}
