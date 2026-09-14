import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatchLevelBadge } from "./MatchLevelBadge";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "jobRecommendations.matchLevel" ? "Mức độ phù hợp" : key),
  }),
}));

describe("MatchLevelBadge", () => {
  it("shows a localized label and a two-decimal percentage", () => {
    render(<MatchLevelBadge percent={70.74} />);

    expect(screen.getByText("Mức độ phù hợp")).toBeInTheDocument();
    expect(screen.getByText("70.74%")).toBeInTheDocument();
  });

  it("keeps compact contexts limited to the percentage", () => {
    render(<MatchLevelBadge percent="49,48%" compact />);

    expect(screen.queryByText("Mức độ phù hợp")).not.toBeInTheDocument();
    expect(screen.getByText("49,48%")).toBeInTheDocument();
  });
});
