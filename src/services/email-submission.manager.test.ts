import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  fetchClient: { GET: vi.fn(), POST: vi.fn() },
}));

import { fetchClient } from "@/lib/api";
import { emailSubmissionManager } from "./email-submission.manager";

const mockGet = fetchClient.GET as ReturnType<typeof vi.fn>;
const mockPost = fetchClient.POST as ReturnType<typeof vi.fn>;

describe("email submission operations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the bare email list returned by the backend", async () => {
    const submissions = [{ id: 8, status: "PENDING", applicationId: 42 }];
    mockGet.mockResolvedValueOnce({ data: submissions });
    await expect(emailSubmissionManager.list()).resolves.toEqual(submissions);
    expect(mockGet).toHaveBeenCalledWith("/api/email-submissions");
  });

  it("treats trigger responses as text and sends no body", async () => {
    mockPost
      .mockResolvedValueOnce({ data: "Đã chạy fetchEmails()" })
      .mockResolvedValueOnce({ data: "Đã chạy processEmailSchedule()" });

    await expect(emailSubmissionManager.fetchMailbox()).resolves.toContain("fetchEmails");
    await expect(emailSubmissionManager.processPending()).resolves.toContain(
      "processEmailSchedule"
    );
    expect(mockPost.mock.calls).toEqual([
      ["/api/email-submissions/fetch"],
      ["/api/email-submissions/process-pending"],
    ]);
  });
});
