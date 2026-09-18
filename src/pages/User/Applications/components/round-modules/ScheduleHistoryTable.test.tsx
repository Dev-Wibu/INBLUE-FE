import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAssignedMentors: vi.fn(),
  useMentorById: vi.fn(),
}));

vi.mock("@/hooks/useApplicationDetails", () => ({
  useAssignedMentors: mocks.useAssignedMentors,
}));

vi.mock("@/hooks/useMentor", () => ({
  useMentorById: mocks.useMentorById,
}));

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string, options?: { id?: number }) =>
      ({
        "mentorSchedule.historyTitle": "Lịch sử thay đổi lịch",
        "mentorSchedule.historyEvent": "Sự kiện",
        "mentorSchedule.historyMentor": "Mentor liên quan",
        "mentorSchedule.historyReason": "Lý do",
        "mentorSchedule.historyTime": "Thời điểm",
        "mentorSchedule.mentorRejectedEvent": "Mentor đã từ chối lịch đề xuất",
        "mentorSchedule.historyCandidateCanceled": "Bạn đã hủy lịch",
        "mentorSchedule.historyNoReason": "Không ghi lý do",
        "mentorSchedule.mentorLoading": "Đang tải mentor...",
        "mentorSchedule.mentorUnknown": "Không có thông tin mentor",
      })[key] ?? (key === "mentorSchedule.mentorIdLabel" ? `Mentor #${options?.id}` : key),
  }),
}));

import { ScheduleHistoryTable } from "./ScheduleHistoryTable";

describe("ScheduleHistoryTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAssignedMentors.mockReturnValue({
      data: [{ id: 7, name: "Mai Anh", currentCompany: "Inblue" }],
      isLoading: false,
    });
    mocks.useMentorById.mockImplementation((id: number) => ({
      data: id === 9 ? { id: 9, name: "Tuan Tran" } : undefined,
      isLoading: false,
    }));
  });

  it("shows the actual mentor for rejection and cancellation without conflating the events", () => {
    render(
      <MemoryRouter>
        <ScheduleHistoryTable
          detailId={123}
          fallbackMentors={[]}
          entries={[
            {
              type: "MENTOR_REJECTED",
              mentorId: 9,
              reason: "Khung giờ bị trùng",
              occurredAt: "2026-09-17T10:00:00",
            },
            {
              type: "CANDIDATE_CANCELED",
              mentorId: 7,
              reason: "Tôi cần đổi lịch",
              occurredAt: "2026-09-18T15:55:00",
            },
          ]}
        />
      </MemoryRouter>
    );

    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Bạn đã hủy lịch")).toBeInTheDocument();
    expect(within(rows[1]).getByRole("link", { name: "Mai Anh" })).toHaveAttribute(
      "href",
      "/user/mentors/7"
    );
    expect(within(rows[1]).getByText("Tôi cần đổi lịch")).toBeInTheDocument();
    expect(within(rows[1]).getByText(/15:55/)).toBeInTheDocument();

    expect(within(rows[2]).getByText("Mentor đã từ chối lịch đề xuất")).toBeInTheDocument();
    expect(within(rows[2]).getByRole("link", { name: "Tuan Tran" })).toHaveAttribute(
      "href",
      "/user/mentors/9"
    );
    expect(within(rows[2]).getByText("Khung giờ bị trùng")).toBeInTheDocument();
    expect(mocks.useAssignedMentors).toHaveBeenCalledWith(123);
    expect(mocks.useMentorById).toHaveBeenCalledWith(9);
  });

  it("keeps the stored mentor id visible when the profile cannot be loaded", () => {
    render(
      <MemoryRouter>
        <ScheduleHistoryTable
          detailId={123}
          fallbackMentors={[]}
          entries={[{ type: "CANDIDATE_CANCELED", mentorId: 11 }]}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Mentor #11")).toBeInTheDocument();
    expect(screen.getByText("Không ghi lý do")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
