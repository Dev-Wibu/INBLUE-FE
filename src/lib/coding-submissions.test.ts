import { describe, expect, it } from "vitest";
import {
  findCodingSubmissionForProblem,
  pairCodingProblemsWithSubmissions,
} from "./coding-submissions";

describe("findCodingSubmissionForProblem", () => {
  it("matches a submission by problemId before considering its position", () => {
    const submissions = [
      { problemId: 22, code: "second" },
      { problemId: 11, code: "first" },
    ];

    expect(findCodingSubmissionForProblem(submissions, 11, 0)?.code).toBe("first");
  });

  it("supports legacy submissions without problemId by position", () => {
    const submissions = [{ code: "first" }, { code: "second" }];

    expect(findCodingSubmissionForProblem(submissions, 22, 1)?.code).toBe("second");
  });

  it("does not reuse the last submission for a missing problem", () => {
    const submissions = [{ problemId: 11, code: "first" }];

    expect(findCodingSubmissionForProblem(submissions, 22, 1)).toBeUndefined();
  });
});

describe("pairCodingProblemsWithSubmissions", () => {
  it("pairs out-of-order submissions with their problems", () => {
    const problems = [{ problemId: 11 }, { problemId: 22 }];
    const submissions = [
      { problemId: 22, code: "second" },
      { problemId: 11, code: "first" },
    ];

    const pairs = pairCodingProblemsWithSubmissions(problems, submissions);

    expect(pairs.map((pair) => pair.submission?.code)).toEqual(["first", "second"]);
  });

  it("pairs legacy submissions without problemId by position", () => {
    const problems = [{ problemId: 11 }, { problemId: 22 }];
    const submissions = [{ code: "first" }, { code: "second" }];

    const pairs = pairCodingProblemsWithSubmissions(problems, submissions);

    expect(pairs.map((pair) => pair.submission?.code)).toEqual(["first", "second"]);
  });

  it("appends every unmatched submission when the problem config is incomplete", () => {
    const problems = [{ problemId: 11 }];
    const submissions = [
      { problemId: 11, code: "first" },
      { problemId: 22, code: "second" },
      { problemId: 33, code: "third" },
    ];

    const pairs = pairCodingProblemsWithSubmissions(problems, submissions);

    expect(pairs).toHaveLength(3);
    expect(pairs.map((pair) => pair.submission?.code)).toEqual(["first", "second", "third"]);
    expect(pairs.map((pair) => pair.submissionIndex)).toEqual([0, 1, 2]);
  });

  it("never assigns one submission to multiple problems", () => {
    const problems = [{ problemId: 11 }, { problemId: 11 }];
    const submissions = [{ problemId: 11, code: "only" }];

    const pairs = pairCodingProblemsWithSubmissions(problems, submissions);

    expect(pairs.filter((pair) => pair.submission).map((pair) => pair.submission?.code)).toEqual([
      "only",
    ]);
  });
});
