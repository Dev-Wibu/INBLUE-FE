export type QuestionSegment =
  | { type: "text"; value: string }
  | { type: "code"; value: string; language: string };

export function parseQuestionContent(text: string): QuestionSegment[] {
  const segments: QuestionSegment[] = [];
  const fencePattern = /```([A-Za-z0-9_+#.-]*)[ \t]*\r?\n?([\s\S]*?)```/g;
  let cursor = 0;

  for (const match of text.matchAll(fencePattern)) {
    const matchIndex = match.index ?? 0;
    const prose = text.slice(cursor, matchIndex).trim();
    if (prose) segments.push({ type: "text", value: prose });

    segments.push({
      type: "code",
      language: (match[1] || "text").toUpperCase(),
      value: match[2].trim(),
    });
    cursor = matchIndex + match[0].length;
  }

  const remainder = text.slice(cursor).trim();
  if (remainder) segments.push({ type: "text", value: remainder });

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}
