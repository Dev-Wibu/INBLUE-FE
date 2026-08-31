import type { TargetLevel, TargetRole } from "../types/entry-test.types";

export const entryTestRoles: Array<{ value: TargetRole; label: string; description: string }> = [
  { value: "FE", label: "Frontend", description: "Giao diện và trải nghiệm web" },
  { value: "BE", label: "Backend", description: "API, dữ liệu và hệ thống" },
  { value: "QA_QC", label: "QA / QC", description: "Chất lượng và kiểm thử" },
  { value: "BA", label: "Business Analyst", description: "Nghiệp vụ và giải pháp" },
  { value: "DEVOPS", label: "DevOps", description: "Hạ tầng và vận hành" },
  { value: "DATA", label: "Data", description: "Dữ liệu và phân tích" },
];

export const entryTestSkillsByRole: Record<TargetRole, string[]> = {
  FE: ["JAVASCRIPT", "TYPESCRIPT", "REACT", "NEXT_JS", "VUE", "HTML_CSS"],
  BE: ["JAVA", "SPRING_BOOT", "NODE_JS", "PYTHON", "DOTNET", "GO"],
  QA_QC: ["MANUAL_TESTING", "SELENIUM", "PLAYWRIGHT", "POSTMAN", "JAVASCRIPT"],
  BA: ["UML", "BPMN", "SQL", "AGILE", "JIRA"],
  DEVOPS: ["DOCKER", "KUBERNETES", "AWS", "LINUX", "CI_CD"],
  DATA: ["PYTHON", "SQL", "POWER_BI", "MACHINE_LEARNING", "SPARK"],
};

export const entryTestLevels: Array<{ value: TargetLevel; label: string }> = [
  { value: "INTERN", label: "Intern" },
  { value: "FRESHER", label: "Fresher" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
];
