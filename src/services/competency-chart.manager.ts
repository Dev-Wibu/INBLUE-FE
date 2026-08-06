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
    "Không thể tìm thấy hồ sơ theo email này."
  );

  return body.data ?? [];
}

export async function getCompetencyChart(applicationId: number): Promise<CompetencyChart> {
  const body = await requestJson<CompetencyChart>(
    `/api/applications/${applicationId}/competency-chart`,
    "Báo cáo năng lực chưa sẵn sàng."
  );

  return body;
}

export async function getJourneySummary(applicationId: number): Promise<JourneySummary> {
  return requestJson<JourneySummary>(
    `/api/applications/${applicationId}/journey-summary`,
    "Không thể tải phần tóm tắt hành trình."
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
      : new Error("Báo cáo năng lực chưa sẵn sàng.");

  return {
    chart,
    journey,
  };
}

export function buildHoloboxCompetencyScript(
  chart: CompetencyChart,
  journey?: JourneySummary | null
): string {
  const strongestTechnical = [...chart.technicalSkillAreas].sort((a, b) => b.score - a.score)[0];
  const weakestTechnical = [...chart.technicalSkillAreas].sort((a, b) => a.score - b.score)[0];
  const strongestBehavioral = [...chart.behavioralSkills].sort((a, b) => b.score - a.score)[0];

  const parts = [
    `Báo cáo năng lực của ${chart.candidateName} cho vị trí ${chart.jobTitle}.`,
    `Điểm tổng quan là ${Math.round(chart.overallScore)} trên 100, tương ứng mức ${competencyLevelLabel[chart.overallLevel]}.`,
  ];

  if (strongestTechnical) {
    parts.push(
      `Năng lực kỹ thuật nổi bật nhất là ${strongestTechnical.skillArea}, đạt ${Math.round(strongestTechnical.score)} điểm.`
    );
  }

  if (weakestTechnical && weakestTechnical !== strongestTechnical) {
    parts.push(
      `Khu vực nên phát triển thêm là ${weakestTechnical.skillArea}, hiện ở mức ${competencyLevelLabel[weakestTechnical.level]}.`
    );
  }

  if (strongestBehavioral) {
    parts.push(`Về hành vi làm việc, điểm mạnh đáng chú ý là ${strongestBehavioral.skillName}.`);
  }

  const narrative = journey?.narrative?.replace(/\s+/g, " ").trim();
  if (narrative) {
    parts.push(narrative.length > 600 ? `${narrative.slice(0, 597)}...` : narrative);
  }

  const assessment = journey?.swecomAssessments?.find((item) => item.evidenceSummary?.trim());
  if (assessment?.evidenceSummary) {
    parts.push(`Minh chứng nổi bật: ${assessment.evidenceSummary.trim()}`);
  }

  const recommendation = journey?.developmentRecommendations?.find((item) =>
    item.recommendation?.trim()
  );
  if (recommendation?.recommendation) {
    parts.push(
      `Gợi ý phát triển tiếp theo cho ${recommendation.targetSkillArea} là ${recommendation.recommendation.trim()}`
    );
  }

  parts.push(
    "Biểu đồ radar thể hiện các vùng năng lực kỹ thuật, còn biểu đồ cột thể hiện các kỹ năng hành vi được ghi nhận trong quá trình đánh giá."
  );

  journey?.swecomAssessments?.slice(1, 3).forEach((item) => {
    if (item.evidenceSummary?.trim()) {
      parts.push(
        `Ở ${item.skillArea}, ứng viên đạt ${Math.round(item.score)} điểm. Minh chứng: ${item.evidenceSummary.trim()}`
      );
    }
  });

  journey?.developmentRecommendations?.slice(1, 3).forEach((item) => {
    if (item.recommendation?.trim()) {
      parts.push(
        `Gợi ý phát triển tiếp theo cho ${item.targetSkillArea} là ${item.recommendation.trim()}`
      );
    }
  });

  return parts.join(" ");
}
