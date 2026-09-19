import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MetricCodeBadge, MetricEvidence, MetricResultIcon } from "./MetricResultDetails";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("metric result details", () => {
  it("renders metric codes without theme-inverting colors", () => {
    render(<MetricCodeBadge code="A1" />);
    const badge = screen.getByText("A1");
    expect(badge).toHaveClass("bg-indigo-50", "text-indigo-700");
    expect(badge).not.toHaveClass("bg-slate-900", "dark:bg-slate-100");
  });

  it.each([
    [true, "structuredAiFeedback.passed", "text-emerald-700"],
    [false, "structuredAiFeedback.failed", "text-rose-700"],
    [null, "structuredAiFeedback.notAssessed", "text-slate-600"],
  ])("labels and colors the icon for result %s", (passed, label, colorClass) => {
    render(<MetricResultIcon passed={passed} />);
    const status = screen.getByRole("img", { name: label });
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass(colorClass);
    expect(status).toHaveClass("h-8", "rounded-full", "border");
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("keeps evidence collapsed until requested", () => {
    render(<MetricEvidence evidence="Supporting detail" />);
    const disclosure = screen.getByText("structuredAiFeedback.evidence").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("structuredAiFeedback.evidence"));
    expect(disclosure).toHaveAttribute("open");
  });
});
