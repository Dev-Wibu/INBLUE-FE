import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bug, FileCode2, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

interface CodeReviewModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  isCompleted: boolean;
  isCurrent: boolean;
}

export function CodeReviewModule({ round, detail, isCompleted, isCurrent }: CodeReviewModuleProps) {
  const { t } = useTranslation();
  const [reviewNotes, setReviewNotes] = useState(
    "1. Lỗi dòng 3: Thiếu 'await' trước res.json() làm trả về một Promise chưa giải quyết.\n2. Lỗi dòng 6: Khai báo mảng memoryCache toàn cục và push phần tử liên tục mà không có cơ chế giải phóng, gây Memory Leak nghiêm trọng.\n3. Lỗi dòng 8: Trả về đối tượng Promise chưa được await."
  );
  const [submitting, setSubmitting] = useState(false);

  const finalScore = detail?.finalScore ?? detail?.aiScore;

  const handleSubmitReview = () => {
    if (!reviewNotes.trim()) {
      toast.error(
        t(
          "userApplicationhistory.enterReviewNotes",
          "Vui lòng nhập chi tiết phản biện / phát hiện lỗi code"
        )
      );
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(
        t("userApplicationhistory.reviewSubmitted", "Đã gửi nhận xét Code Review thành công!")
      );
    }, 1200);
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
              "userApplicationhistory.codeReviewInstructionDefault",
              "Đọc hiểu đoạn mã nguồn bên dưới, tìm ra các lỗi tiềm ẩn (Security, Performance, Anti-patterns) và đưa ra nhận xét phản biện kỹ thuật chuẩn xác."
            )}
        </div>
      </div>

      {/* Code Snippet Inspector */}
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-6 py-3 dark:border-slate-800 dark:bg-[#0F172A]">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <FileCode2 className="h-4 w-4 text-rose-500" />
            <span>Target Code Snippet (Contains 3 BUGS)</span>
          </div>

          {finalScore !== undefined && finalScore !== null && (
            <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Điểm AI: {finalScore}/100
            </span>
          )}
        </div>

        {/* Code Snippet Display */}
        <pre className="overflow-x-auto bg-[#090D16] p-4 font-mono text-xs leading-relaxed text-rose-300">
          {`1  async function fetchUserData(userId: string) {
2    const res = await fetch(\`/api/users/\${userId}\`);
3    const data = res.json(); // ⚠️ BUG 1: Missing 'await' on res.json()
4    
5    let memoryCache = [];
6    memoryCache.push(data); // ⚠️ BUG 2: Unbounded array push causing Memory Leak
7    
8    return data; // ⚠️ BUG 3: Returns unresolved Promise object
9  }`}
        </pre>

        {/* Critique Input Form */}
        <div className="space-y-3 p-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Bug className="h-4 w-4 text-amber-500" />
            <span>Nhập phát hiện lỗi & Lời khuyên Refactor của bạn:</span>
          </div>
          <textarea
            disabled={isCompleted || !isCurrent}
            rows={5}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-sans text-xs leading-relaxed text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100"
            placeholder="Ghi rõ các dòng lỗi và phương án sửa chữa..."
          />

          {!isCompleted && isCurrent && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="h-9.5 gap-2 bg-indigo-600 px-6 text-xs font-bold text-white shadow-xs hover:bg-indigo-700">
                {submitting ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    <span>Đang chấm điểm Code Review...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Gửi Đánh Giá Code Review</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
