import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  getRecommendations: vi.fn(),
}));

vi.mock("@/services/job-description.manager", () => ({
  jobDescriptionManager: mocks,
}));

vi.mock("./JobDetailContainer", () => ({
  JobDetailContainer: () => <div data-testid="job-detail" />,
}));

import { JobSearchTab } from "./JobSearchTab";

function renderTab(url: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <JobSearchTab />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("JobSearchTab recommendation mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    mocks.getAll.mockResolvedValue({ success: true, data: [] });
    mocks.getRecommendations.mockResolvedValue({ success: true, data: [] });
  });

  it("does not request recommendations in all-jobs mode", async () => {
    renderTab("/user?tab=jobSearch&mode=all");

    await waitFor(() => expect(mocks.getAll).toHaveBeenCalledTimes(1));
    expect(mocks.getRecommendations).not.toHaveBeenCalled();
  });

  it("requests and preserves backend order in recommendation mode", async () => {
    mocks.getRecommendations.mockResolvedValue({
      success: true,
      data: [
        { id: 3, title: "Third ID first", status: "OPEN" },
        { id: 9, title: "Ninth ID second", status: "OPEN" },
      ],
    });

    renderTab("/user?tab=jobSearch&mode=recommended");

    await waitFor(() => expect(mocks.getRecommendations).toHaveBeenCalledTimes(1));
    const headings = await screen.findAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Third ID first",
      "Ninth ID second",
    ]);
  });
});
