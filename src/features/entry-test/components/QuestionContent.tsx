import { Code2 } from "lucide-react";
import type { ReactNode } from "react";

import { parseQuestionContent } from "../utils/question-content";

export function QuestionContent({ text, codeLabel }: { text: string; codeLabel: string }) {
  const segments = parseQuestionContent(text);

  return (
    <div className="space-y-4">
      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <div
            key={`${segment.type}-${index}`}
            className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="flex h-9 items-center justify-between border-b border-slate-800 bg-slate-900 px-3.5">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
                <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                {codeLabel}
              </span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
                {segment.language || "TEXT"}
              </span>
            </div>
            <pre className="max-h-80 overflow-auto p-4 text-[13px] leading-6 text-slate-100">
              <code className="font-mono break-words whitespace-pre-wrap">{segment.value}</code>
            </pre>
          </div>
        ) : (
          <p
            key={`${segment.type}-${index}`}
            className="text-lg leading-8 font-semibold whitespace-pre-wrap text-slate-950 md:text-xl dark:text-white">
            {renderInlineCode(segment.value)}
          </p>
        )
      )}
    </div>
  );
}

function renderInlineCode(text: string): ReactNode[] {
  return text.split(/(`[^`\n]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.88em] font-semibold text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
