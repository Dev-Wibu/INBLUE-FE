import type { InterviewSession } from "@/interfaces";

export function getAiInterviewMode(session: InterviewSession): string | null {
  return session.mode ?? session.sessionConfig?.interview_mode ?? null;
}

export function getAiInterviewDomain(session: InterviewSession): string | null {
  return session.domain ?? session.sessionConfig?.domain ?? null;
}

export function getAiInterviewJobTitle(session: InterviewSession): string | null {
  const basicInfo = session.jobRequirement?.basic_info as
    | { job_title?: string | null }
    | null
    | undefined;
  return basicInfo?.job_title?.trim() || session.candidateProfile?.targetRole?.trim() || null;
}

export function isAiInterviewResumable(session: InterviewSession): boolean {
  return session.status === "IN_PROGRESS" && Boolean(session.sessionKey?.trim());
}

export function hasAiInterviewScore(session: InterviewSession): boolean {
  return typeof session.overallScore === "number" && Number.isFinite(session.overallScore);
}
