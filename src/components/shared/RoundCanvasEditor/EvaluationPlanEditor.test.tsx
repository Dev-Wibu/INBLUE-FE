import { fireEvent, render } from "@testing-library/react";
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
  it("keeps an untouched form calm, then reveals errors on blur or save attempt", () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <EvaluationPlanEditor value={incompletePlan} onChange={onChange} />
    );

    expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);

    const codeInput = container.querySelector('input[placeholder="TECH_DEPTH"]');
    expect(codeInput).not.toBeNull();
    fireEvent.blur(codeInput!);

    expect(codeInput).toHaveAttribute("aria-invalid", "true");
    expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1);

    rerender(<EvaluationPlanEditor value={incompletePlan} onChange={onChange} showAllErrors />);

    expect(container.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThan(1);
  });
});
