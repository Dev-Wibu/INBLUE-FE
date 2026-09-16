import type { Mentor } from "@/interfaces";

function definedFields(mentor: Mentor): Partial<Mentor> {
  return Object.fromEntries(
    Object.entries(mentor).filter(([, value]) => value !== undefined && value !== null)
  ) as Partial<Mentor>;
}

export function mergeAndRankMentors(
  mentors: ReadonlyArray<Mentor>,
  recommendedMentors: ReadonlyArray<Mentor>
): Mentor[] {
  const byId = new Map<number, Mentor>();

  mentors.forEach((mentor) => {
    if (mentor.id != null && mentor.active !== false) {
      byId.set(mentor.id, mentor);
    }
  });

  recommendedMentors.forEach((recommended) => {
    if (recommended.id == null || recommended.active === false) return;
    const existing = byId.get(recommended.id);
    byId.set(recommended.id, {
      ...existing,
      ...definedFields(recommended),
    } as Mentor);
  });

  return Array.from(byId.values()).sort((left, right) => {
    const leftMatch = Number.isFinite(left.matchPercent) ? Number(left.matchPercent) : -1;
    const rightMatch = Number.isFinite(right.matchPercent) ? Number(right.matchPercent) : -1;
    if (rightMatch !== leftMatch) return rightMatch - leftMatch;
    return (left.name || left.email || "").localeCompare(right.name || right.email || "", "vi");
  });
}
