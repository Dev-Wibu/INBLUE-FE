import type { SchemaMentorResponse } from "@/interfaces/schema.types";
import i18n from "@/lib/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MentorActionPanel } from "./MentorActionPanel";
const t = i18n.t.bind(i18n);
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
    expect(
      screen.getByRole("button", {
        name: t("userMentordetail.copy"),
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: t("userMentordetail.contactEmail"),
      })
    ).not.toBeInTheDocument();
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
    fireEvent.click(
      screen.getByRole("button", {
        name: t("userMentordetail.copy"),
      })
    );
    expect(writeTextMock).toHaveBeenCalledWith("mentor.b@example.com");
    await waitFor(() => {
      expect(toastMocks.success).toHaveBeenCalledWith(t("common.mentorEmailCopied"));
    });
    expect(toastMocks.error).not.toHaveBeenCalled();
  });
});
