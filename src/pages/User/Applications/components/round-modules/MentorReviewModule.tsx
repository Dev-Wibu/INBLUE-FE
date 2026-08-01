import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Calendar, Star, UserCheck, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

interface MentorReviewModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  isCompleted: boolean;
  isCurrent: boolean;
}

export function MentorReviewModule({
  round,
  detail,
  applicationId,
  isCurrent,
}: MentorReviewModuleProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const finalScore = detail?.finalScore ?? detail?.hrScore;

  const handleGoToMentorReview = () => {
    navigate(`/user/application/${applicationId}/mentor-review`);
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
              "userApplicationhistory.mentorInstructionDefault",
              "Vòng phỏng vấn trực tiếp 1-1 cùng Chuyên gia / Mentor tuyển dụng hàng đầu. Đặt lịch phỏng vấn và truy cập phòng thi Video Call."
            )}
        </div>
      </div>

      {/* Mentor Card Container */}
      <Card className="overflow-hidden border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            {/* Mentor Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <UserCheck className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Senior Technical Lead Mentor
                </h3>
                <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  4.9/5
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chuyên gia 8+ năm kinh nghiệm kiến trúc hệ thống & đánh giá ứng viên
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>Thời lượng phỏng vấn: 45 phút</span>
              </div>
            </div>
          </div>

          {/* Action or Score */}
          {finalScore !== undefined && finalScore !== null ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 text-center lg:w-48 dark:border-indigo-950/60 dark:bg-indigo-950/30">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                Đánh giá Mentor
              </span>
              <p className="mt-1 text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {finalScore}/100
              </p>
              <span className="mt-1 text-[10px] font-bold text-indigo-700 uppercase dark:text-indigo-300">
                ✓ Hoàn thành phỏng vấn
              </span>
            </div>
          ) : (
            isCurrent && (
              <Button
                onClick={handleGoToMentorReview}
                className="h-11 gap-2 bg-indigo-600 px-8 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700">
                <Video className="h-4 w-4" />
                <span>Đặt lịch & Vào phòng Video Call</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </Card>
    </div>
  );
}
