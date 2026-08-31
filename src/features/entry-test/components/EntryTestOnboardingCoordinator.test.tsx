import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EntryTestOnboardingCoordinator } from "./EntryTestOnboardingCoordinator";

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (_state: { user: { id: number } }) => unknown) =>
    selector({ user: { id: 7 } }),
}));

vi.mock("../hooks/useCareerPreference", () => ({
  useCareerPreferenceExists: () => ({ data: mocks.exists() }),
}));

vi.mock("./CareerPreferenceWizard", () => ({
  CareerPreferenceWizard: ({ open }: { open: boolean }) => (
    <div data-testid="career-wizard-state">{open ? "open" : "closed"}</div>
  ),
}));

describe("EntryTestOnboardingCoordinator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens onboarding for any user without a preference record", () => {
    mocks.exists.mockReturnValue(false);
    render(<EntryTestOnboardingCoordinator />);
    expect(screen.getByTestId("career-wizard-state")).toHaveTextContent("open");
  });

  it("does not interrupt users who already have a preference", () => {
    mocks.exists.mockReturnValue(true);
    render(<EntryTestOnboardingCoordinator />);
    expect(screen.getByTestId("career-wizard-state")).toHaveTextContent("closed");
  });
});
