import type { TopDevJobImportRequest, TopDevJobPreview, TopDevSearchParams } from "@/services";

/** Backend accepts at most five records per request. The admin view groups two
 * backend pages so the default table page can show ten records like the other
 * management screens. */
export const TOPDEV_API_PAGE_SIZE = 5;
export const TOPDEV_PAGE_SIZE = 10;

export function toImportPayload(
  job: TopDevJobPreview,
  fallbackLevel?: TopDevSearchParams["level"]
): TopDevJobImportRequest {
  return {
    title: job.title?.trim() ?? "",
    companyName: job.companyName?.trim() ?? "",
    companyLogo: job.companyLogo,
    companyDescription: job.companyDescription,
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
    skills: job.skills,
    location: job.location,
    salary: job.salary,
    source: job.source,
    sourceUrl: job.sourceUrl,
    sourceJobId: job.sourceJobId,
    requestedLevel: job.requestedLevel ?? fallbackLevel,
  };
}

export function resolveDisplayedLevel(
  job: TopDevJobPreview,
  persistedLevel?: string
): string | undefined {
  return job.isExist ? persistedLevel : job.requestedLevel;
}

export function splitSkills(skills?: string): string[] {
  if (!skills) return [];
  return skills
    .split(/[,;|]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export function plainText(value?: string): string {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}
