import { useEffect, useRef, useState } from "react";

import type { EntryTestDraftV1 } from "../types/entry-test.types";
import { loadEntryTestDraft, saveEntryTestDraft } from "../utils/entry-test-storage";

export function useEntryTestDraft(userId: number, attemptId: number) {
  const [draft, setDraft] = useState<EntryTestDraftV1 | null>(() =>
    loadEntryTestDraft(userId, attemptId)
  );
  const latestDraftRef = useRef(draft);

  useEffect(() => {
    latestDraftRef.current = draft;
    if (!draft) return;
    const timer = window.setTimeout(() => saveEntryTestDraft(draft), 400);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    const persistLatest = () => {
      if (latestDraftRef.current) saveEntryTestDraft(latestDraftRef.current);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistLatest();
    };
    window.addEventListener("pagehide", persistLatest);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", persistLatest);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      persistLatest();
    };
  }, []);

  return { draft, setDraft, latestDraftRef };
}
