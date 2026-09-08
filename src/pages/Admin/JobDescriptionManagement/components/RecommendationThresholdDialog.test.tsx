import i18n from "@/lib/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendationThresholdDialog } from "./RecommendationThresholdDialog";

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RecommendationThresholdDialog open onOpenChange={vi.fn()} />
    </QueryClientProvider>
  );
}

describe("RecommendationThresholdDialog", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
  });

  it("explains the setting in Vietnamese", () => {
    renderDialog();

    expect(screen.getByText("Thiết lập mức độ phù hợp")).toBeInTheDocument();
    expect(screen.getByText("Thiết lập này hoạt động thế nào?")).toBeInTheDocument();
    expect(screen.getByText("Hồ sơ kỹ năng")).toBeInTheDocument();
    expect(screen.queryByText(/matching/i)).not.toBeInTheDocument();
  });

  it("fills the input and updates the preview from a quick option", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /70% Cân bằng/i }));

    expect(screen.getByRole("spinbutton", { name: "Mức độ phù hợp tối thiểu" })).toHaveValue(70);
    expect(screen.getByText("Chỉ gợi ý công việc đạt từ 70% phù hợp")).toBeInTheDocument();
  });
});
