import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EvaluationPlanEditor } from "./EvaluationPlanEditor";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const incompletePlan = {
  metrics: [
    {
      code: "",
      name: "",
      description: "",
      weight: 50,
      maxScore: 100,
      required: true,
      minimumScore: 0,
    },
  ],
  scoringInstruction: "",
  passRule: "",
};

describe("EvaluationPlanEditor validation timing", () => {
  it("constrains long metric codes and wraps long metric names inside their columns", () => {
    const longCode = "ACADEMIC_BACKGROUND_AND_PROFESSIONAL_EXPERIENCE";
    const longName = "Academic background, specialist knowledge, and relevant work experience";
    const { container } = render(
      <EvaluationPlanEditor
        value={{
          metrics: [
            {
              code: longCode,
              name: longName,
              description: "",
              weight: 100,
              maxScore: 100,
              required: false,
              minimumScore: 0,
            },
          ],
        }}
        onChange={vi.fn()}
      />
    );

    const code = container.querySelector(`span[title="${longCode}"]`);
    const name = container.querySelector(`span[title="${longName}"]`);

    expect(code).toHaveClass("truncate");
    expect(name).toHaveClass("line-clamp-2", "break-words");
    expect(container.querySelector("colgroup")).not.toBeNull();
  });

  it("keeps an untouched form calm, then reveals errors on blur or save attempt", () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <EvaluationPlanEditor value={incompletePlan} onChange={onChange} />
    );

    expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);

    const editButton = container.querySelector('button[aria-label="Sửa tiêu chí"]');
    expect(editButton).not.toBeNull();
    fireEvent.click(editButton!);

    const codeInput = container.querySelector('input[placeholder="TECH_DEPTH"]');
    expect(codeInput).not.toBeNull();
    fireEvent.blur(codeInput!);

    expect(codeInput).toHaveAttribute("aria-invalid", "true");
    expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1);

    rerender(<EvaluationPlanEditor value={incompletePlan} onChange={onChange} showAllErrors />);

    expect(container.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThan(1);
  });

  it("opens the first invalid metric when a save attempt reveals errors", async () => {
    const { container } = render(
      <EvaluationPlanEditor value={incompletePlan} onChange={vi.fn()} showAllErrors />
    );

    await waitFor(() => {
      expect(container.querySelector('input[placeholder="TECH_DEPTH"]')).not.toBeNull();
    });
    expect(container.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThan(1);
  });

  it("exposes numeric limits that match evaluation validation", () => {
    const { container } = render(
      <EvaluationPlanEditor value={incompletePlan} onChange={vi.fn()} />
    );

    fireEvent.click(container.querySelector('button[aria-label="Sửa tiêu chí"]')!);

    expect(container.querySelector('input[aria-label="Trọng số (%)"]')).toHaveAttribute(
      "min",
      "0.01"
    );
    expect(container.querySelector('input[aria-label="Điểm tối đa (>0 đến 100)"]')).toHaveAttribute(
      "min",
      "0.01"
    );
    expect(
      container.querySelector('input[aria-label="Điểm sàn (0 đến điểm tối đa)"]')
    ).toHaveAttribute("min", "0.01");
    expect(container.querySelector('[data-slot="checkbox"]')).not.toBeNull();
  });
});
