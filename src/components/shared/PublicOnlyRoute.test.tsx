import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublicOnlyRoute } from "./PublicOnlyRoute";

const mocks = vi.hoisted(() => ({
  state: { isLoggedIn: true, user: { role: "USER" } },
}));

vi.mock("react-router-dom", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
  Outlet: () => <div data-testid="outlet">outlet</div>,
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector?: (state: typeof mocks.state) => unknown) =>
    selector ? selector(mocks.state) : mocks.state,
}));

describe("PublicOnlyRoute", () => {
  it("sends authenticated users to the protected user dashboard", () => {
    render(<PublicOnlyRoute />);
    expect(screen.getByTestId("redirect")).toHaveTextContent("/user");
  });
});
