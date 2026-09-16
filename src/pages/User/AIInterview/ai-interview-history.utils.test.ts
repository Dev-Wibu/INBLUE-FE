import { describe, expect, it } from "vitest";

import type { InterviewSession } from "@/interfaces";
import {
  getAiInterviewDomain,
  getAiInterviewJobTitle,
  getAiInterviewMode,
  hasAiInterviewScore,
  isAiInterviewResumable,
} from "./ai-interview-history.utils";

const session = (overrides: Partial<InterviewSession> = {}): InterviewSession => ({
  id: 1,
  ...overrides,
});

describe("AI interview history helpers", () => {
  it("uses snapshot values when root mode and domain are missing", () => {
    const value = session({
      sessionConfig: { interview_mode: "THEORY_CHECK", domain: "NON_IT" },
    });

    expect(getAiInterviewMode(value)).toBe("THEORY_CHECK");
    expect(getAiInterviewDomain(value)).toBe("NON_IT");
  });

  it("prefers the job requirement title and falls back to the candidate target role", () => {
    expect(
      getAiInterviewJobTitle(
        session({
          jobRequirement: { basic_info: { job_title: "Backend Developer" } },
          candidateProfile: { targetRole: "Software Engineer" },
        })
      )
    ).toBe("Backend Developer");
    expect(
      getAiInterviewJobTitle(session({ candidateProfile: { targetRole: "Software Engineer" } }))
    ).toBe("Software Engineer");
  });

  it("only marks an in-progress session with a key as resumable", () => {
    expect(
      isAiInterviewResumable(session({ status: "IN_PROGRESS", sessionKey: "session-key" }))
    ).toBe(true);
    expect(isAiInterviewResumable(session({ status: "CREATED", sessionKey: "session-key" }))).toBe(
      false
    );
    expect(isAiInterviewResumable(session({ status: "IN_PROGRESS" }))).toBe(false);
  });

  it("keeps zero as a valid score and rejects missing values", () => {
    expect(hasAiInterviewScore(session({ overallScore: 0 }))).toBe(true);
    expect(hasAiInterviewScore(session())).toBe(false);
  });
});
