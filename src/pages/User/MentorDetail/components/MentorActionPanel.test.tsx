import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SchemaMentorResponse } from "@/interfaces/schema.types";

import { MentorActionPanel } from "./MentorActionPanel";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastMocks.success,
    error: toastMocks.error,
  },
}));

describe("MentorActionPanel", () => {
  const mentor: SchemaMentorResponse = {
    id: 88,
    name: "Mentor B",
    email: "mentor.b@example.com",
    linkedInUrl: "https://linkedin.com/in/mentor-b",
  };

  beforeEach(() => {
    toastMocks.success.mockClear();
    toastMocks.error.mockClear();
  });

  it("shows copy email action and does not render mailto link", () => {
    render(<MentorActionPanel mentor={mentor} onBookNow={vi.fn()} onStartChat={vi.fn()} />);

    expect(screen.getByText("mentor.b@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sao chép" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Email liên hệ" })).not.toBeInTheDocument();
  });

  it("copies mentor email and shows success toast", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    });

    render(<MentorActionPanel mentor={mentor} onBookNow={vi.fn()} onStartChat={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Sao chép" }));

    expect(writeTextMock).toHaveBeenCalledWith("mentor.b@example.com");
    await waitFor(() => {
      expect(toastMocks.success).toHaveBeenCalledWith("Đã sao chép email mentor");
    });
    expect(toastMocks.error).not.toHaveBeenCalled();
  });
});
