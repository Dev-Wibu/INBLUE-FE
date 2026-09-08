export type TargetRole = "BE" | "FE" | "QA_QC" | "BA" | "DEVOPS" | "DATA";

export type TargetLevel = "INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE";

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADED" | "EXPIRED";

export type EntryTestSectionType = "COMMON_QUIZ" | "SPECIFIC_QUIZ" | "SPECIFIC_CODING";

export type EntryTestItemType = "QUESTION_BANK" | "CODING_PROBLEM";

export type CompilerLanguage =
  | "PYTHON"
  | "JS"
  | "JAVA"
  | "CPP"
  | "CSHARP"
  | "C"
  | "TYPESCRIPT"
  | "GO"
  | "KOTLIN"
  | "SWIFT"
  | "RUST"
  | "RUBY"
  | "PHP"
  | "DART"
  | "SCALA"
  | "ELIXIR"
  | "ERLANG"
  | "RACKET";

export type UserCareerPreference = {
  userId: number;
  targetRole: TargetRole | null;
  languagesJson: string[] | null;
  careerGoal: string | null;
  targetLevel: TargetLevel | null;
  needRetest: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertCareerPreferenceBody = {
  targetRole: TargetRole;
  languagesJson: string[] | null;
  careerGoal: string | null;
  targetLevel: TargetLevel | null;
};

export type EntryTestSectionConfig = {
  sectionType: EntryTestSectionType;
  itemType: EntryTestItemType;
  itemCount: number;
  totalScore: number;
  scorePerItem: number;
  displayOrder: number;
};

export type EntryTestQuestion = {
  itemId: string;
  questionBankId: number;
  questionText: string;
  options: string[];
  categoryName: string | null;
  difficulty: string | null;
  maxScore: number;
  displayOrder: number;
};

export type CodingVisibleExample = {
  inputs: string[];
  output: string;
  explanation?: string | null;
};

export type EntryTestCodingItem = {
  itemId: string;
  codingProblemId: number;
  title: string;
  difficulty: string;
  problemStatement: string;
  rulesAndConstraints: string[];
  visibleExamples: CodingVisibleExample[];
  codeStubs: Partial<Record<CompilerLanguage, string>>;
  paramTypes: string[];
  returnType: string;
  executionTimeLimitMs: number;
  memoryLimitMb: number;
  maxScore: number;
  displayOrder: number;
};

export type EntryTestStartResponse = {
  attemptId: number;
  entryTestId: number;
  timeLimitMinutes: number;
  selectedLanguagesJson: string[];
  sectionConfigs: EntryTestSectionConfig[];
  commonQuizItemsJson: EntryTestQuestion[];
  specificQuizItemsJson: EntryTestQuestion[];
  specificCodingItemsJson: EntryTestCodingItem[];
};

export type SubmitAnswer = {
  itemId: string;
  answerJson: { selectedOption: string } | { language: CompilerLanguage; sourceCode: string[] };
};

export type EntryTestSubmitBody = { answers: SubmitAnswer[] };

export type EntryTestRunCodeRequest = {
  itemId: string;
  language: CompilerLanguage;
  sourceCode: string[];
};

export type CompilerRunTestCase = {
  index: number;
  status: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTimeMs: number;
  errorMessage: string | null;
};

export type CompilerRunResponse = {
  status: string;
  passedTestCases: number;
  totalTestCases: number;
  executionTimeMs: number;
  errorMessage: string | null;
  testCases: CompilerRunTestCase[];
};

export type EntryTestAnswerResult = {
  itemId: string;
  sectionType: EntryTestSectionType;
  answerType: EntryTestItemType;
  answerJson: Record<string, unknown>;
  score: number;
  isCorrect: boolean;
  gradedAt: string;
};

export type EntryTestAttemptResponse = {
  id: number;
  userId: number;
  careerPreferenceId: number;
  entryTestId: number;
  selectedLanguagesJson: string[];
  commonQuizItemsJson: EntryTestQuestion[];
  specificQuizItemsJson: EntryTestQuestion[];
  specificCodingItemsJson: EntryTestCodingItem[];
  answersJson: EntryTestAnswerResult[] | null;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  commonQuizScore: number | null;
  specificQuizScore: number | null;
  specificCodingScore: number | null;
  finalScore: number | null;
  resultLevel: TargetLevel | null;
  resultSnapshotJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type UserCompetencyResponse = {
  id: number;
  userId: number;
  careerPreferenceId: number;
  targetRole: TargetRole;
  languagesJson: string[];
  currentLevel: TargetLevel;
  currentScore: number;
  commonQuizScore: number;
  specificQuizScore: number;
  specificCodingScore: number;
  competencySnapshotJson: Record<string, unknown>;
  lastEntryTestAttemptId: number;
  lastEvaluatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type EntryTestDraftV1 = {
  version: 1;
  userId: number;
  attemptId: number;
  entryTestId: number;
  timeLimitMinutes: number;
  deadlineEpochMs: number;
  currentSection: EntryTestSectionType;
  currentItemId: string | null;
  quizDrafts: Record<string, string>;
  codingDrafts: Record<string, { language: CompilerLanguage; sourceCode: string[] }>;
  testSnapshot: EntryTestStartResponse;
  savedAt: string;
};
