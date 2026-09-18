import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
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
    useQuery: () => ({
      data: {
        id: 21,
        applicationId: 12,
        targetRole: "Backend Engineer",
        technicalSkills: ["Java"],
      },
      isLoading: false,
    }),
  },
}));

vi.mock("@/pages/KioskApp", () => ({
  StandaloneKioskPage: ({
    initialSessionKey,
    initialDurationMinutes,
    experienceMode,
  }: {
    initialSessionKey: string;
    initialDurationMinutes: number;
    experienceMode: string;
  }) => (
    <div
      data-testid="voice-selector"
      data-session-key={initialSessionKey}
      data-duration={initialDurationMinutes}
      data-experience-mode={experienceMode}
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
    mocks.createSession.mockResolvedValue({
      data: "123e4567-e89b-12d3-a456-426614174000",
      error: undefined,
    });
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
  });
});
