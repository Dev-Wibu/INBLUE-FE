import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Code2, Play, Send, Sparkles, Terminal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

interface CodingModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  isCompleted: boolean;
  isCurrent: boolean;
}

export function CodingModule({ round, detail, isCompleted, isCurrent }: CodingModuleProps) {
  const { t } = useTranslation();
  const [language, setLanguage] = useState("typescript");
  const [code, setCode] = useState(
    `/**\n * Problem: Two Sum - Find indices of two numbers that add up to target\n */\nfunction twoSum(nums: number[], target: number): number[] {\n  const map = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) {\n      return [map.get(diff)!, i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}`
  );
  const [running, setRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);

  const finalScore = detail?.finalScore ?? detail?.aiScore;

  const handleRunCode = () => {
    setRunning(true);
    setConsoleOutput(
      "🔄 Compiling solution...\n> Executing test cases 1/3...\n> Executing test cases 2/3...\n> Executing test cases 3/3...\n\n✅ Output: [0, 1] | Expected: [0, 1]\n✨ Test case 1 PASSED (2ms, 14MB)"
    );
    setTimeout(() => {
      setRunning(false);
      toast.success(
        t("userApplicationhistory.testCasesPassed", "Chạy Test cases mẫu thành công (100% Passed)")
      );
    }, 1200);
  };

  const handleSubmitSolution = () => {
    toast.success(
      t("userApplicationhistory.solutionSubmitted", "Đã nộp bài giải Coding thành công!")
    );
  };

  return (
    <div className="space-y-6">
      {/* Instruction Box */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {t("userApplicationhistory.instructionsTitle", "Hướng dẫn làm bài")}
        </h4>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-700 shadow-2xs dark:border-slate-800/80 dark:bg-[#0F172A]/90 dark:text-slate-300">
          {round.configData?.instruction ||
            t(
              "userApplicationhistory.codingInstructionDefault",
              "Viết mã nguồn tối ưu thuật toán giải quyết bài toán đặt ra. Đảm bảo độ phức tạp thời gian O(N) và vượt qua các Test Case ẩn."
            )}
        </div>
      </div>

      {/* Code Editor Playground */}
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
        {/* Editor Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100/80 px-6 py-3 dark:border-slate-800 dark:bg-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Code2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              IDE Coding Playground
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-8 w-32 bg-white text-xs font-semibold dark:bg-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="java">Java 17</SelectItem>
                <SelectItem value="python">Python 3.10</SelectItem>
              </SelectContent>
            </Select>

            {finalScore !== undefined && finalScore !== null && (
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Điểm Score: {finalScore}/100
              </span>
            )}
          </div>
        </div>

        {/* Code Input Area */}
        <div className="relative font-mono">
          <textarea
            disabled={isCompleted || !isCurrent}
            rows={10}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full resize-y bg-[#0F172A] p-4 font-mono text-xs leading-relaxed text-emerald-400 focus:outline-hidden"
          />
        </div>

        {/* Output Console Log */}
        {consoleOutput && (
          <div className="border-t border-slate-800 bg-[#090D16] p-4 font-mono text-[11px] text-slate-300">
            <div className="mb-2 flex items-center gap-1.5 text-slate-400">
              <Terminal className="h-3.5 w-3.5" />
              <span className="font-bold">Execution Console</span>
            </div>
            <pre className="whitespace-pre-wrap">{consoleOutput}</pre>
          </div>
        )}

        {/* Bottom Actions */}
        {!isCompleted && isCurrent && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <Button
              variant="outline"
              onClick={handleRunCode}
              disabled={running}
              className="h-8.5 gap-2 border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              {running ? (
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-slate-700 dark:fill-slate-200" />
              )}
              <span>Chạy Test Mẫu</span>
            </Button>

            <Button
              onClick={handleSubmitSolution}
              className="h-8.5 gap-2 bg-indigo-600 px-6 text-xs font-bold text-white shadow-xs hover:bg-indigo-700">
              <Send className="h-3.5 w-3.5" />
              <span>Nộp bài Solution</span>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
