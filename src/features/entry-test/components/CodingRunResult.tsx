import { CheckCircle2, ChevronDown, ChevronUp, CircleX, Clock3, Terminal } from "lucide-react";

import type { CompilerRunResponse } from "../types/entry-test.types";

export function CodingRunResult({
  result,
  collapsed = false,
  onToggle,
}: {
  result: CompilerRunResponse;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const passed = result.passedTestCases === result.totalTestCases && result.totalTestCases > 0;
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-10 shrink-0 items-center justify-between border-b border-slate-800 px-4 text-left hover:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold">Kết quả chạy thử</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={
              passed
                ? "text-xs font-semibold text-emerald-400"
                : "text-xs font-semibold text-rose-400"
            }>
            {result.passedTestCases}/{result.totalTestCases} test đã qua
          </span>
          {onToggle &&
            (collapsed ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ))}
        </div>
      </button>
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {result.errorMessage && (
            <p className="mb-3 rounded-md bg-rose-950/60 p-2 text-xs text-rose-300">
              {result.errorMessage}
            </p>
          )}
          <div className="space-y-2">
            {result.testCases.map((testCase) => {
              const success = testCase.status === "PASSED";
              return (
                <div
                  key={testCase.index}
                  className="rounded-md border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      {success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <CircleX className="h-4 w-4 text-rose-400" />
                      )}
                      Test {testCase.index + 1}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock3 className="h-3 w-3" />
                      {testCase.executionTimeMs} ms
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-3">
                    <CodeValue label="Input" value={testCase.input} />
                    <CodeValue label="Kỳ vọng" value={testCase.expectedOutput} />
                    <CodeValue
                      label="Thực tế"
                      value={testCase.actualOutput || testCase.errorMessage || "-"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CodeValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500">{label}</span>
      <pre className="mt-1 overflow-x-auto font-mono whitespace-pre-wrap text-slate-200">
        {value}
      </pre>
    </div>
  );
}
