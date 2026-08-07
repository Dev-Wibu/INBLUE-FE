import { API_BASE_URL } from "@/constants/api.config";

export type ApplicationStatus = "IN_PROGRESS" | "PASSED" | "FAILED" | "SOFT_FAILED";

export type CompetencyLevel =
  | "TECHNICIAN"
  | "ENTRY_LEVEL_PRACTITIONER"
  | "PRACTITIONER"
  | "TECHNICAL_LEADER"
  | "SENIOR_SOFTWARE_ENGINEER";

export type CompetencyApplication = {
  id: number;
  userId: number;
  jdId: number;
  applicationName?: string;
  currentRoundOrder: number;
  status: ApplicationStatus;
  overallScore: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SkillAreaScore = {
  skillArea: string;
  score: number;
  level: CompetencyLevel;
  sourceRounds: string[];
};

export type BehavioralSkillScore = {
  skillName: string;
  score: number;
  sourceRounds: string[];
};

export type CompetencyChart = {
  applicationId: number;
  candidateName: string;
  jobTitle: string;
  overallLevel: CompetencyLevel;
  overallScore: number;
  technicalSkillAreas: SkillAreaScore[];
  behavioralSkills: BehavioralSkillScore[];
  traceId?: string;
};

export type SwecomAssessment = {
  skillArea: string;
  level: CompetencyLevel;
  score: number;
  evidenceSummary: string;
  sourceRounds: string[];
};

export type DevelopmentRecommendation = {
  targetSkillArea: string;
  recommendation: string;
  targetLevel: CompetencyLevel;
};

export type JourneySummary = {
  id?: number;
  applicationId: number;
  narrative?: string;
  competencyChart?: CompetencyChart;
  swecomAssessments?: SwecomAssessment[];
  developmentRecommendations?: DevelopmentRecommendation[];
  generatedAt?: string;
  traceId?: string;
};

export type CompetencyResult = {
  chart: CompetencyChart;
  journey: JourneySummary | null;
};

export const competencyLevelLabel: Record<CompetencyLevel, string> = {
  TECHNICIAN: "Technician",
  ENTRY_LEVEL_PRACTITIONER: "Entry Level Practitioner",
  PRACTITIONER: "Practitioner",
  TECHNICAL_LEADER: "Technical Leader",
  SENIOR_SOFTWARE_ENGINEER: "Senior Software Engineer",
};

export class CompetencyChartError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = "CompetencyChartError";
  }
}

async function requestJson<T>(path: string, fallbackMessage: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const errorBody = body as { error?: string; message?: string } | undefined;
    throw new CompetencyChartError(
      errorBody?.error ?? errorBody?.message ?? fallbackMessage,
      response.status
    );
  }

  return body as T;
}

export async function getApplicationsByEmail(email: string): Promise<CompetencyApplication[]> {
  const query = new URLSearchParams({ email: email.trim() });
  const body = await requestJson<{ data?: CompetencyApplication[] }>(
    `/api/applications/by-email?${query.toString()}`,
    "Unable to find applications for this email."
  );

  return body.data ?? [];
}

export async function getCompetencyChart(applicationId: number): Promise<CompetencyChart> {
  const body = await requestJson<CompetencyChart>(
    `/api/applications/${applicationId}/competency-chart`,
    "The competency report is not ready yet."
  );

  return body;
}

export async function getJourneySummary(applicationId: number): Promise<JourneySummary> {
  return requestJson<JourneySummary>(
    `/api/applications/${applicationId}/journey-summary`,
    "Unable to load the journey summary."
  );
}

export async function getCompetencyResult(applicationId: number): Promise<CompetencyResult> {
  const [chartResult, journeyResult] = await Promise.allSettled([
    getCompetencyChart(applicationId),
    getJourneySummary(applicationId),
  ]);

  const journey = journeyResult.status === "fulfilled" ? journeyResult.value : null;
  const chart = chartResult.status === "fulfilled" ? chartResult.value : journey?.competencyChart;

  if (!chart)
    throw chartResult.status === "rejected"
      ? chartResult.reason
      : new Error("The competency report is not ready yet.");

  return {
    chart,
    journey,
  };
}

export const competencyLevelLabelVi: Record<CompetencyLevel, string> = {
  TECHNICIAN: "Kỹ thuật viên",
  ENTRY_LEVEL_PRACTITIONER: "Thực hành sơ cấp",
  PRACTITIONER: "Thực hành",
  TECHNICAL_LEADER: "Trưởng nhóm kỹ thuật",
  SENIOR_SOFTWARE_ENGINEER: "Kỹ sư cao cấp",
};

const containsVietnamese = (text?: string): boolean => {
  if (!text) return false;
  return /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);
};

export function buildHoloboxCompetencyScript(
  chart: CompetencyChart,
  journey?: JourneySummary | null
): string {
  const narrative = journey?.narrative?.replace(/\s+/g, " ").trim();
  const assessment = journey?.swecomAssessments?.find((item) => item.evidenceSummary?.trim());
  const recommendation = journey?.developmentRecommendations?.find((item) =>
    item.recommendation?.trim()
  );

  const isVi =
    containsVietnamese(narrative) ||
    containsVietnamese(assessment?.evidenceSummary) ||
    containsVietnamese(recommendation?.recommendation) ||
    containsVietnamese(chart.candidateName) ||
    containsVietnamese(chart.jobTitle);

  const strongestTechnical = [...chart.technicalSkillAreas].sort((a, b) => b.score - a.score)[0];
  const weakestTechnical = [...chart.technicalSkillAreas].sort((a, b) => a.score - b.score)[0];
  const strongestBehavioral = [...chart.behavioralSkills].sort((a, b) => b.score - a.score)[0];

  if (isVi) {
    const parts = [
      `Đây là báo cáo đánh giá năng lực của ứng viên ${chart.candidateName}, ứng tuyển vị trí ${chart.jobTitle}.`,
      `Điểm tổng thể đạt ${Math.round(chart.overallScore)} trên 100, tương ứng với cấp độ ${competencyLevelLabelVi[chart.overallLevel] ?? competencyLevelLabel[chart.overallLevel]}.`,
    ];

    if (strongestTechnical) {
      parts.push(
        `Năng lực kỹ thuật mạnh nhất là ${strongestTechnical.skillArea}, đạt ${Math.round(strongestTechnical.score)} điểm.`
      );
    }

    if (weakestTechnical && weakestTechnical !== strongestTechnical) {
      parts.push(
        `Lĩnh vực cần tập trung phát triển là ${weakestTechnical.skillArea}, hiện ở cấp độ ${competencyLevelLabelVi[weakestTechnical.level] ?? competencyLevelLabel[weakestTechnical.level]}.`
      );
    }

    if (strongestBehavioral) {
      parts.push(
        `Về kỹ năng hành vi công sở, thế mạnh nổi bật nhất là ${strongestBehavioral.skillName}.`
      );
    }

    if (narrative) {
      parts.push(narrative.length > 600 ? `${narrative.slice(0, 597)}...` : narrative);
    }

    if (assessment?.evidenceSummary) {
      parts.push(`Bằng chứng đánh giá ghi nhận: ${assessment.evidenceSummary.trim()}`);
    }

    if (recommendation?.recommendation) {
      parts.push(
        `Gợi ý phát triển tiếp theo cho ${recommendation.targetSkillArea} là: ${recommendation.recommendation.trim()}`
      );
    }

    parts.push(
      "Biểu đồ thể hiện chi tiết các nhóm năng lực kỹ thuật và kỹ năng hành vi quan sát được trong quá trình đánh giá."
    );

    journey?.swecomAssessments?.slice(1, 3).forEach((item) => {
      if (item.evidenceSummary?.trim()) {
        parts.push(
          `Đối với ${item.skillArea}, ứng viên đạt ${Math.round(item.score)} điểm. Minh chứng: ${item.evidenceSummary.trim()}`
        );
      }
    });

    journey?.developmentRecommendations?.slice(1, 3).forEach((item) => {
      if (item.recommendation?.trim()) {
        parts.push(
          `Gợi ý phát triển cho ${item.targetSkillArea} là: ${item.recommendation.trim()}`
        );
      }
    });

    return parts.join(" ");
  }

  const parts = [
    `This is the competency report for ${chart.candidateName}, applying for ${chart.jobTitle}.`,
    `The overall score is ${Math.round(chart.overallScore)} out of 100, corresponding to the ${competencyLevelLabel[chart.overallLevel]} level.`,
  ];

  if (strongestTechnical) {
    parts.push(
      `The strongest technical area is ${strongestTechnical.skillArea}, with a score of ${Math.round(strongestTechnical.score)}.`
    );
  }

  if (weakestTechnical && weakestTechnical !== strongestTechnical) {
    parts.push(
      `The main area for development is ${weakestTechnical.skillArea}, currently at the ${competencyLevelLabel[weakestTechnical.level]} level.`
    );
  }

  if (strongestBehavioral) {
    parts.push(
      `For workplace behavior, the most notable strength is ${strongestBehavioral.skillName}.`
    );
  }

  if (narrative) {
    parts.push(narrative.length > 600 ? `${narrative.slice(0, 597)}...` : narrative);
  }

  if (assessment?.evidenceSummary) {
    parts.push(`A notable piece of evidence is: ${assessment.evidenceSummary.trim()}`);
  }

  if (recommendation?.recommendation) {
    parts.push(
      `The next development suggestion for ${recommendation.targetSkillArea} is ${recommendation.recommendation.trim()}`
    );
  }

  parts.push(
    "The radar chart shows technical competency areas, while the skill bars show behavioral capabilities observed during the assessment."
  );

  journey?.swecomAssessments?.slice(1, 3).forEach((item) => {
    if (item.evidenceSummary?.trim()) {
      parts.push(
        `For ${item.skillArea}, the candidate scored ${Math.round(item.score)}. Evidence: ${item.evidenceSummary.trim()}`
      );
    }
  });

  journey?.developmentRecommendations?.slice(1, 3).forEach((item) => {
    if (item.recommendation?.trim()) {
      parts.push(
        `The next development suggestion for ${item.targetSkillArea} is ${item.recommendation.trim()}`
      );
    }
  });

  return parts.join(" ");
}
