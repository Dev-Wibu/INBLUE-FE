import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  sessionCache: vi.fn(),
}));

vi.mock("@/hooks/useApplicationDetails", () => ({
  useApplicationDetails: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useRound", () => ({
  useCurrentRound: () => ({
    data: { id: 8, configData: { instruction: "Backend interview", timeLimitMinutes: 25 } },
    isLoading: false,
  }),
}));

vi.mock("@/lib/api", () => ({
  fetchClient: {
    POST: mocks.createSession,
  },
  $api: {
    useQuery: (_method: string, path: string) =>
      path === "/api/interview-sessions/cache/{sessionKey}"
        ? mocks.sessionCache()
        : {
            data: {
              id: 21,
              applicationId: 12,
              targetRole: "Backend Engineer",
              technicalSkills: ["Java"],
            },
            isLoading: false,
          },
  },
}));

vi.mock("@/pages/KioskApp", () => ({
  StandaloneKioskPage: ({
    initialSessionKey,
    initialDurationMinutes,
    experienceMode,
    initialStartResponse,
    initialSessionCache,
  }: {
    initialSessionKey: string;
    initialDurationMinutes: number;
    experienceMode: string;
    initialStartResponse?: { questionContent?: string };
    initialSessionCache?: { chatHistory?: unknown[] };
  }) => (
    <div
      data-testid="voice-selector"
      data-session-key={initialSessionKey}
      data-duration={initialDurationMinutes}
      data-experience-mode={experienceMode}
      data-question={initialStartResponse?.questionContent ?? ""}
      data-history-count={initialSessionCache?.chatHistory?.length ?? 0}
    />
  ),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (_state: { user: { id: number } }) => unknown) =>
    selector({ user: { id: 7 } }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

import { ApplicationAIInterviewPage } from "./ApplicationAIInterviewPage";

describe("ApplicationAIInterviewPage web flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.createSession.mockResolvedValue({
      data: "123e4567-e89b-12d3-a456-426614174000",
      error: undefined,
    });
    mocks.sessionCache.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("creates the session for the application detail and opens voice selection", async () => {
    render(
      <MemoryRouter initialEntries={["/user/application/12/ai-interview?applicationDetailId=42"]}>
        <Routes>
          <Route
            path="/user/application/:applicationId/ai-interview"
            element={<ApplicationAIInterviewPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(mocks.createSession).toHaveBeenCalledTimes(1));

    const [endpoint, request] = mocks.createSession.mock.calls[0] as [
      string,
      {
        body: Record<string, unknown>;
        parseAs: string;
      },
    ];
    expect(endpoint).toBe("/api/interview-sessions/create-session");
    expect(request.parseAs).toBe("text");
    expect(request.body.application_detail_id).toBe(42);
    expect(request.body).not.toHaveProperty("application_id");
    expect(request.body.candidate_profile).toEqual(
      expect.objectContaining({
        id: 21,
        applicationId: 12,
        targetRole: "Backend Engineer",
      })
    );

    const voiceSelector = await screen.findByTestId("voice-selector");
    expect(voiceSelector).toHaveAttribute(
      "data-session-key",
      "123e4567-e89b-12d3-a456-426614174000"
    );
    expect(voiceSelector).toHaveAttribute("data-duration", "25");
    expect(voiceSelector).toHaveAttribute("data-experience-mode", "web");
    expect(JSON.parse(localStorage.getItem("application-ai-interview:42") ?? "null")).toEqual(
      expect.objectContaining({
        sessionKey: "123e4567-e89b-12d3-a456-426614174000",
        applicationId: 12,
        applicationDetailId: 42,
      })
    );
  });

  it("resumes the existing session in the application interview UI without creating another one", async () => {
    mocks.sessionCache.mockReturnValue({
      data: {
        chatHistory: [{ questionText: "Câu hỏi cũ", answerText: "Câu trả lời cũ" }],
        currentQuestionText: "Câu hỏi đang trả lời",
      },
      isLoading: false,
    });
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/user/application/210/ai-interview",
            search: "?applicationDetailId=527&sessionKey=existing-session-key",
            state: {
              resumedQuestion: { questionContent: "Câu hỏi đang trả lời" },
              resumeDurationMinutes: 45,
            },
          },
        ]}>
        <Routes>
          <Route
            path="/user/application/:applicationId/ai-interview"
            element={<ApplicationAIInterviewPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    const voiceSelector = await screen.findByTestId("voice-selector");
    expect(voiceSelector).toHaveAttribute("data-session-key", "existing-session-key");
    expect(voiceSelector).toHaveAttribute("data-duration", "45");
    expect(voiceSelector).toHaveAttribute("data-question", "Câu hỏi đang trả lời");
    expect(voiceSelector).toHaveAttribute("data-history-count", "1");
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("application-ai-interview-app:210") ?? "null")).toEqual(
      expect.objectContaining({
        sessionKey: "existing-session-key",
        applicationDetailId: 527,
      })
    );
  });
});
