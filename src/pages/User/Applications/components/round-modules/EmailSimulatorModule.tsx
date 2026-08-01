import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { applicationDetailManager } from "@/services/application-detail.manager";
import { Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

interface EmailSimulatorModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  isCompleted: boolean;
  isCurrent: boolean;
  onSuccess?: () => void;
}

export function EmailSimulatorModule({
  round,
  detail,
  applicationId,
  isCompleted,
  isCurrent,
  onSuccess,
}: EmailSimulatorModuleProps) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState(
    "[Phản hồi] Báo cáo tình hình xử lý sự cố hệ thống & Đề xuất giải pháp"
  );
  const [emailBody, setEmailBody] = useState(
    "Kính gửi Anh/Chị Trưởng phòng,\n\nEm xin phép báo cáo tiến độ xử lý sự cố vừa phát sinh. Hiện tại đội ngũ kỹ thuật đã cô lập được nguyên nhân..."
  );
  const [submitting, setSubmitting] = useState(false);

  const finalScore = detail?.finalScore ?? detail?.aiScore;

  const handleSubmitEmail = async () => {
    if (!subject.trim() || !emailBody.trim()) {
      toast.error(
        t(
          "userApplicationhistory.fillEmailFields",
          "Vui lòng điền đầy đủ Tiêu đề và Nội dung email"
        )
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await applicationDetailManager.submit({
        applicationId,
        textContent: `Subject: ${subject}\n\n${emailBody}`,
      });

      if (res.success) {
        toast.success(
          t(
            "userApplicationhistory.emailSubmittedSuccess",
            "Gửi email mô phỏng thành công! Hệ thống AI đang đánh giá văn phong."
          )
        );
        onSuccess?.();
      } else {
        toast.error(res.error || "Gửi email không thành công");
      }
    } catch (err) {
      console.error("[EmailSimulatorModule] Submit error:", err);
      toast.error("Có lỗi xảy ra khi gửi email");
    } finally {
      setSubmitting(false);
    }
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
              "userApplicationhistory.emailInstructionDefault",
              "Hãy đóng vai vị trí ứng tuyển để phản hồi Email của cấp trên/khách hàng theo đúng chuẩn mực giao tiếp công sở, từ chối hoặc đề xuất giải pháp hợp lý."
            )}
        </div>
      </div>

      {/* Simulated Email Client Container */}
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
        {/* Email Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              ✉️ Inblue Corporate Mail Client Simulator
            </span>
          </div>
          {finalScore !== undefined && finalScore !== null && (
            <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Điểm AI: {finalScore}/100
            </span>
          )}
        </div>

        {/* Email Fields */}
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <span className="w-16 text-xs font-bold text-slate-500 dark:text-slate-400">
              Người nhận:
            </span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              hiring-manager@enterprise-domain.com
            </span>
          </div>

          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <span className="w-16 text-xs font-bold text-slate-500 dark:text-slate-400">
              Tiêu đề:
            </span>
            <Input
              disabled={isCompleted || !isCurrent}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-8 border-none bg-transparent p-0 text-xs font-bold text-slate-900 focus-visible:ring-0 dark:text-white"
              placeholder="Nhập tiêu đề email..."
            />
          </div>

          {/* Email Body Area */}
          <div className="pt-2">
            <textarea
              disabled={isCompleted || !isCurrent}
              rows={8}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs leading-relaxed text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100"
              placeholder="Soạn nội dung email ứng tuyển tại đây..."
            />
          </div>

          {/* Send CTA Button */}
          {!isCompleted && isCurrent && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSubmitEmail}
                disabled={submitting}
                className="h-9.5 gap-2 bg-indigo-600 px-6 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700">
                {submitting ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    <span>AI Đang chấm điểm văn phong...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Gửi Email & Chấm điểm AI</span>
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
