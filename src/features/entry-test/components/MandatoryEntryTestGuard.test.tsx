import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MandatoryEntryTestGuard } from "./MandatoryEntryTestGuard";

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  preference: vi.fn(),
  location: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useLocation: () => mocks.location(),
  Navigate: ({ to, state }: { to: string; state?: { from?: string } }) => (
    <div data-testid="redirect" data-from={state?.from}>
      {to}
    </div>
  ),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({ isLoggedIn: true, user: { id: 7, role: "USER" } }),
}));

vi.mock("../hooks/useCareerPreference", () => ({
  useCareerPreferenceExists: () => ({
    data: mocks.exists(),
    isLoading: false,
  }),
  useCareerPreference: () => ({
    ...mocks.preference(),
    isLoading: false,
  }),
}));

describe("MandatoryEntryTestGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.location.mockReturnValue({
      pathname: "/user",
      search: "?tab=jobSearch",
      hash: "#recommended",
    });
    mocks.preference.mockReturnValue({ data: undefined, isError: false, error: null });
  });

  it("redirects a new user and preserves the complete requested URL", () => {
    mocks.exists.mockReturnValue(false);

    render(<MandatoryEntryTestGuard />);

    expect(screen.getByTestId("redirect")).toHaveTextContent("/user/entry-test/onboarding");
    expect(screen.getByTestId("redirect")).toHaveAttribute(
      "data-from",
      "/user?tab=jobSearch#recommended"
    );
  });

  it("allows a user who deferred setup with an empty preference record", () => {
    mocks.exists.mockReturnValue(true);
    mocks.preference.mockReturnValue({
      data: { targetRole: null },
      isError: false,
      error: null,
    });

    render(<MandatoryEntryTestGuard />);

    expect(screen.queryByTestId("redirect")).not.toBeInTheDocument();
  });

  it("recovers an inconsistent preference existence response", () => {
    mocks.exists.mockReturnValue(true);
    mocks.preference.mockReturnValue({
      data: undefined,
      isError: true,
      error: { status: 404 },
    });

    render(<MandatoryEntryTestGuard />);

    expect(screen.getByTestId("redirect")).toHaveTextContent("/user/entry-test/onboarding");
  });
});
