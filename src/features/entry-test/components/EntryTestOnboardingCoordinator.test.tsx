import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EntryTestOnboardingCoordinator } from "./EntryTestOnboardingCoordinator";

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (_state: { user: { id: number } }) => unknown) =>
    selector({ user: { id: 7 } }),
}));

vi.mock("../hooks/useCareerPreference", () => ({
  useCareerPreferenceExists: () => ({ data: mocks.exists() }),
}));

describe("EntryTestOnboardingCoordinator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens onboarding for any user without a preference record", () => {
    mocks.exists.mockReturnValue(false);
    render(<EntryTestOnboardingCoordinator />);
    expect(screen.getByTestId("redirect")).toHaveTextContent("/user/entry-test/onboarding");
  });

  it("does not interrupt users who already have a preference", () => {
    mocks.exists.mockReturnValue(true);
    render(<EntryTestOnboardingCoordinator />);
    expect(screen.queryByTestId("redirect")).not.toBeInTheDocument();
  });
});
