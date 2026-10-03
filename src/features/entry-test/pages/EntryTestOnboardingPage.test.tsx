import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EntryTestOnboardingPage } from "./EntryTestOnboardingPage";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  skip: vi.fn(),
  save: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/assets/icon2.svg", () => ({ default: "icon.svg" }));
vi.mock("@/components/LanguageToggle", () => ({ LanguageToggle: () => null }));
vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
  useLocation: () => ({
    pathname: "/user/entry-test/onboarding",
    state: { from: "/user?tab=jobSearch#recommended" },
  }),
  useNavigate: () => mocks.navigate,
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (_state: { user: { id: number } }) => unknown) =>
    selector({ user: { id: 7 } }),
}));

vi.mock("../hooks/useCareerPreference", () => ({
  useCareerPreferenceExists: () => ({ data: false }),
  useCareerPreference: () => ({ data: undefined, isLoading: false }),
  useUpsertCareerPreference: () => ({ mutateAsync: mocks.save, isPending: false }),
  useSkipCareerPreference: () => ({ mutateAsync: mocks.skip, isPending: false }),
}));

describe("EntryTestOnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.skip.mockResolvedValue({ targetRole: null });
  });

  it("confirms deferred setup, persists the skip marker, and returns to the requested URL", async () => {
    render(<EntryTestOnboardingPage />);

    fireEvent.click(screen.getByRole("button", { name: "entryTestOnboarding.later" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("entryTestOnboarding.skipConfirmTitle")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "entryTestOnboarding.confirmSkip" }));

    await waitFor(() => expect(mocks.skip).toHaveBeenCalledTimes(1));
    expect(mocks.navigate).toHaveBeenCalledWith("/user?tab=jobSearch#recommended", {
      replace: true,
    });
  });

  it("keeps the user on onboarding when the skip request fails", async () => {
    mocks.skip.mockRejectedValue(new Error("network"));
    render(<EntryTestOnboardingPage />);

    fireEvent.click(screen.getByRole("button", { name: "entryTestOnboarding.later" }));
    fireEvent.click(screen.getByRole("button", { name: "entryTestOnboarding.confirmSkip" }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("entryTestOnboarding.skipError")
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
