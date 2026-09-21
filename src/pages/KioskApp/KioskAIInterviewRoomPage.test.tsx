import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KioskAIInterviewRoomPage } from "./KioskAIInterviewRoomPage";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  submit: vi.fn(),
}));

vi.mock("@/services/kiosk/kioskApi.service", () => ({
  startInterviewApi: () => new Promise(() => undefined),
  generateTtsAudioApi: mocks.generate,
  submitAnswerApi: mocks.submit,
}));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
  mocks.generate.mockReset();
  mocks.submit.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("KioskAIInterviewRoomPage", () => {
  it("does not display sample candidate history while the session starts", () => {
    const { unmount } = render(
      <KioskAIInterviewRoomPage sessionKey="current-session" experienceMode="web" />
    );

    expect(screen.getByText("0 tin nhắn")).toBeInTheDocument();
    expect(screen.getByText("Đang tải câu hỏi phỏng vấn...")).toBeInTheDocument();
    expect(screen.queryByText(/Thành Lam/)).not.toBeInTheDocument();
    unmount();
  });

  it("does not replay the current question when resuming a session", () => {
    render(
      <KioskAIInterviewRoomPage
        sessionKey="resumed-session"
        experienceMode="web"
        initialStartResponse={{ questionContent: "Câu hỏi đang thực hiện" }}
      />
    );

    expect(screen.getAllByText("Câu hỏi đang thực hiện")).toHaveLength(2);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("sends a typed answer with Enter", async () => {
    mocks.submit.mockResolvedValue({ questionContent: "Câu hỏi kế tiếp" });
    render(
      <KioskAIInterviewRoomPage
        sessionKey="active-session"
        experienceMode="web"
        initialStartResponse={{ questionContent: "Câu hỏi hiện tại" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "CHỈNH SỬA" }));
    const input = screen.getByLabelText("Câu trả lời của bạn");
    fireEvent.change(input, { target: { value: "Câu trả lời bằng bàn phím" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(mocks.submit).toHaveBeenCalledWith("active-session", "Câu trả lời bằng bàn phím");
    });
  });

  it("shows the redesigned evaluation state after the final answer", async () => {
    mocks.submit.mockResolvedValue({ finished: true });
    render(
      <KioskAIInterviewRoomPage
        sessionKey="finishing-session"
        experienceMode="web"
        initialStartResponse={{ questionContent: "Câu hỏi cuối" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "CHỈNH SỬA" }));
    const input = screen.getByLabelText("Câu trả lời của bạn");
    fireEvent.change(input, { target: { value: "Câu trả lời cuối" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(
      await screen.findByRole("heading", { name: "Đang đánh giá kết quả" })
    ).toBeInTheDocument();
    expect(screen.queryByText("⏳")).not.toBeInTheDocument();
  });

  it("shows the redesigned completion state without decorative emoji", () => {
    render(
      <KioskAIInterviewRoomPage
        sessionKey="completed-session"
        experienceMode="web"
        initialStartResponse={{ finished: true }}
      />
    );

    expect(screen.getByRole("heading", { name: "Hoàn thành phỏng vấn AI" })).toBeInTheDocument();
    expect(screen.queryByText("🏆")).not.toBeInTheDocument();
  });
});
