export type QuestionSegment =
  | { type: "text"; value: string }
  | { type: "code"; value: string; language: string };

export function parseQuestionContent(text: string): QuestionSegment[] {
  const normalizedText = text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
  const segments: QuestionSegment[] = [];
  const fencePattern = /```([A-Za-z0-9_+#.-]*)[ \t]*\r?\n?([\s\S]*?)```/g;
  let cursor = 0;

  for (const match of normalizedText.matchAll(fencePattern)) {
    const matchIndex = match.index ?? 0;
    const prose = normalizedText.slice(cursor, matchIndex).trim();
    if (prose) segments.push({ type: "text", value: prose });

    segments.push({
      type: "code",
      language: (match[1] || "text").toUpperCase(),
      value: match[2].replace(/\\n/g, "\n").trim(),
    });
    cursor = matchIndex + match[0].length;
  }

  const remainder = normalizedText.slice(cursor).trim();
  if (remainder) segments.push({ type: "text", value: remainder });

  return segments.length > 0 ? segments : [{ type: "text", value: normalizedText }];
}
