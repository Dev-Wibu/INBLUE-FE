import { Check, Code2, Copy } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { parseQuestionContent } from "../utils/question-content";

export function QuestionContent({ text, codeLabel }: { text: string; codeLabel: string }) {
  const segments = parseQuestionContent(text);

  return (
    <div className="space-y-4">
      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <div
            key={`${segment.type}-${index}`}
            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <CodeBlock value={segment.value} language={segment.language} label={codeLabel} />
          </div>
        ) : (
          <RichTextBlock key={`${segment.type}-${index}`} text={segment.value} />
        )
      )}
    </div>
  );
}

function CodeBlock({ value, language, label }: { value: string; language: string; label: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-white px-3.5 dark:border-slate-800 dark:bg-slate-900">
        <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <Code2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300" />
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {language || "TEXT"}
          </span>
          <button
            type="button"
            onClick={() => void copyCode()}
            className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-700 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
            title={t("common.copy")}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            <span className="sr-only">{t("common.copy")}</span>
          </button>
        </div>
      </div>
      <pre className="max-h-96 overflow-auto p-4 text-[13px] leading-6 text-slate-700 dark:text-slate-200">
        <code className="font-mono whitespace-pre">{highlightCode(value)}</code>
      </pre>
    </>
  );
}

function RichTextBlock({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-7 text-slate-700 dark:text-slate-300">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap">
          {renderInlineCode(paragraph)}
        </p>
      ))}
    </div>
  );
}

function highlightCode(code: string): ReactNode[] {
  const tokenPattern =
    /(\/\/.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:public|private|protected|class|static|void|int|long|double|float|boolean|string|return|new|if|else|for|while|const|let|var|function|true|false|null|undefined|extends|implements|interface|import|from|export)\b|\b\d+(?:\.\d+)?\b)/gm;
  return code.split(tokenPattern).map((part, index) => {
    if (/^\/\/|^\/\*/.test(part)) {
      return (
        <span key={index} className="text-slate-400 dark:text-slate-500">
          {part}
        </span>
      );
    }
    if (/^["']/.test(part)) {
      return (
        <span key={index} className="text-emerald-700 dark:text-emerald-300">
          {part}
        </span>
      );
    }
    if (/^\d/.test(part)) {
      return (
        <span key={index} className="text-amber-700 dark:text-amber-300">
          {part}
        </span>
      );
    }
    if (
      /^(public|private|protected|class|static|void|int|long|double|float|boolean|string|return|new|if|else|for|while|const|let|var|function|true|false|null|undefined|extends|implements|interface|import|from|export)$/.test(
        part
      )
    ) {
      return (
        <span key={index} className="font-semibold text-indigo-700 dark:text-indigo-300">
          {part}
        </span>
      );
    }
    return part;
  });
}

function renderInlineCode(text: string): ReactNode[] {
  return text
    .replace(/\\"/g, '"')
    .split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|@\w+(?:\.\w+)*)/g)
    .map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (
        (part.startsWith("**") && part.endsWith("**")) ||
        (part.startsWith("__") && part.endsWith("__"))
      ) {
        return (
          <strong key={index} className="font-bold text-slate-950 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("@")) {
        return (
          <code
            key={index}
            className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300">
            {part}
          </code>
        );
      }
      return part;
    });
}
