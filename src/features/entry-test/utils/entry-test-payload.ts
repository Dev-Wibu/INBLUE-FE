import type {
  CompilerLanguage,
  EntryTestCodingItem,
  EntryTestQuestion,
  EntryTestSubmitBody,
} from "../types/entry-test.types";

export const editorTextToSourceLines = (value: string) => value.split(/\r?\n/);
export const sourceLinesToEditorText = (lines: string[]) => lines.join("\n");

export function normalizeCareerLanguages(languages: string[]) {
  return [...new Set(languages.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function buildSubmitPayload(
  questions: EntryTestQuestion[],
  codingItems: EntryTestCodingItem[],
  quizDrafts: Record<string, string>,
  codingDrafts: Record<string, { language: CompilerLanguage; sourceCode: string[] }>
): EntryTestSubmitBody {
  const validQuestionIds = new Set(questions.map((item) => item.itemId));
  const validCodingIds = new Set(codingItems.map((item) => item.itemId));
  const answers = [] as EntryTestSubmitBody["answers"];

  for (const [itemId, selectedOption] of Object.entries(quizDrafts)) {
    if (validQuestionIds.has(itemId) && /^[A-Z]$/.test(selectedOption)) {
      answers.push({ itemId, answerJson: { selectedOption } });
    }
  }

  for (const [itemId, draft] of Object.entries(codingDrafts)) {
    if (validCodingIds.has(itemId) && draft.sourceCode.some((line) => line.trim())) {
      answers.push({ itemId, answerJson: draft });
    }
  }

  return { answers };
}
