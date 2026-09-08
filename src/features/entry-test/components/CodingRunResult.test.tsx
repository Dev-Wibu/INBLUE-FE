import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import i18n from "@/lib/i18n";

import type { CompilerRunResponse } from "../types/entry-test.types";
import { CodingRunResult } from "./CodingRunResult";

const result: CompilerRunResponse = {
  status: "COMPLETED",
  passedTestCases: 1,
  totalTestCases: 1,
  executionTimeMs: 12,
  errorMessage: null,
  testCases: [
    {
      index: 0,
      status: "PASSED",
      input: "1, 2",
      expectedOutput: "3",
      actualOutput: "3",
      executionTimeMs: 12,
      errorMessage: null,
    },
  ],
};

describe("CodingRunResult", () => {
  it("uses localized labels and light surfaces by default", async () => {
    await i18n.changeLanguage("en");
    const { container } = render(<CodingRunResult result={result} />);

    expect(screen.getByText("Test results")).toBeInTheDocument();
    expect(screen.getByText("1/1 tests passed")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("bg-white", "dark:bg-slate-950");
    expect(screen.getByText("Test 1").closest("div.rounded-md")).toHaveClass(
      "bg-slate-50",
      "dark:bg-slate-900"
    );
  });
});
