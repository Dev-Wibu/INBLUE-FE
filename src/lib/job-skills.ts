export interface JobSkillSource {
  skillTags?: readonly (string | null | undefined)[] | null;
  skills?: readonly (string | null | undefined)[] | null;
}

export function getJobSkillTags(job?: JobSkillSource | null): string[] {
  const source = Array.isArray(job?.skillTags) ? job.skillTags : job?.skills;
  if (!Array.isArray(source)) return [];

  const seen = new Set<string>();
  return source.reduce<string[]>((tags, value) => {
    const tag = typeof value === "string" ? value.trim() : "";
    const normalized = tag.toLocaleLowerCase();
    if (tag && !seen.has(normalized)) {
      seen.add(normalized);
      tags.push(tag);
    }
    return tags;
  }, []);
}

export function parseJobSkillTags(value: string): string[] {
  return getJobSkillTags({ skillTags: value.split(/[,;\n]/) });
}
