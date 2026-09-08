export const entryTestKeys = {
  all: ["entry-test"] as const,
  preference: () => [...entryTestKeys.all, "career-preference"] as const,
  preferenceExists: () => [...entryTestKeys.preference(), "exists"] as const,
  attempt: (attemptId: number) => [...entryTestKeys.all, "attempt", attemptId] as const,
  competency: () => [...entryTestKeys.all, "competency"] as const,
};
