import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { formatDate } from "@/lib/formatting";
import type { MentorReview } from "@/services/mentor-review.manager";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  Star,
  Target,
  ThumbsUp,
  Trash2,
  TrendingUp,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface ReviewDetailViewProps {
  review: MentorReview;
  onBack: () => void;
  onDelete?: () => void;
}

const getRatingLabel = (rating: number) => {
  if (rating >= 5) return "Xuất sắc";
  if (rating >= 4) return "Rất tốt";
  if (rating >= 3) return "Đạt yêu cầu";
  if (rating >= 2) return "Cần cố gắng";
  return "Chưa đạt";
};

export function ReviewDetailView({ review, onBack, onDelete }: ReviewDetailViewProps) {
  const { t } = useTranslation();

  const joinDate =
    review.session?.joinTime ||
    review.session?.startTime1 ||
    (review as Record<string, unknown>).createdAt ||
    (review as Record<string, unknown>).created_at ||
    review.session?.createdAt ||
    review.session?.created_at;

  const formattedDate = joinDate ? formatDate(String(joinDate)) : "—";

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      {/* ── TOP SUBHEADER / BREADCRUMB CARD ── */}
      <div className="flex flex-col gap-3.5 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="h-9 gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>{t("common.back", "Quay lại")}</span>
            </Button>

            <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <span
              onClick={onBack}
              className="cursor-pointer text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
              {t("common.reviewFromMentor", "Đánh giá từ mentor")}
            </span>

            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />

            <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
              Chi tiết đánh giá #{review.id}
            </h1>

            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/80 bg-amber-50/80 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {review.rating || 0}/5 sao ({getRatingLabel(review.rating || 0)})
            </span>
          </div>

          {/* Header Right Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={onDelete}
                className="h-9 gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-950/50 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/50">
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t("common.delete", "Xóa")}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT 2-COLUMN DASHBOARD LAYOUT ── */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left Column (65%): Ratings & Detailed STAR Feedback */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Rating Hero Card */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 p-6 shadow-xs sm:flex-row dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-inner dark:bg-amber-950/60 dark:text-amber-400">
                <Star className="h-7 w-7 fill-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-3xl font-extrabold text-slate-900 dark:text-white">
                    {review.rating || 0}.0
                  </span>
                  <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-xs font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300">
                    {getRatingLabel(review.rating || 0)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Được đánh giá vào {formattedDate} bởi Mentor {review.mentor?.name || ""}
                </p>
              </div>
            </div>

            <StarRating value={review.rating || 0} readOnly size="lg" />
          </div>

          {/* STAR Method Analysis Container */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-white">
              <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                {t("adminReviewmanagement.starMethodEvaluation", "Đánh giá mô hình STAR")}
              </span>
            </h3>

            <div className="space-y-4">
              {review.situationNote && (
                <div className="rounded-r-2xl border-l-3 border-emerald-500 bg-emerald-50/60 p-4 dark:bg-emerald-950/30">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{t("common.situation", "Bối cảnh (Situation)")}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {review.situationNote}
                  </p>
                </div>
              )}

              {review.taskNote && (
                <div className="rounded-r-2xl border-l-3 border-sky-500 bg-sky-50/60 p-4 dark:bg-sky-950/30">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-sky-700 dark:text-sky-400">
                    <Target className="h-3.5 w-3.5" />
                    <span>{t("common.mission", "Nhiệm vụ (Task)")}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {review.taskNote}
                  </p>
                </div>
              )}

              {review.actionNote && (
                <div className="rounded-r-2xl border-l-3 border-purple-500 bg-purple-50/60 p-4 dark:bg-purple-950/30">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-400">
                    <Zap className="h-3.5 w-3.5" />
                    <span>{t("common.act", "Hành động (Action)")}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {review.actionNote}
                  </p>
                </div>
              )}

              {review.resultNote && (
                <div className="rounded-r-2xl border-l-3 border-amber-500 bg-amber-50/60 p-4 dark:bg-amber-950/30">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>{t("common.result", "Kết quả (Result)")}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {review.resultNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback & Improvement Section */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-white">
              <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                {t(
                  "adminReviewmanagement.feedbackAndImprovement",
                  "Nhận xét chuyên sâu & Định hướng"
                )}
              </span>
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {review.strength && (
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>{t("common.strengths", "Điểm mạnh nổi bật")}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {review.strength}
                  </p>
                </div>
              )}

              {review.weakness && (
                <div className="rounded-2xl border border-rose-200/60 bg-rose-50/40 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{t("adminReviewmanagement.weakness", "Điểm cần cải thiện")}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {review.weakness}
                  </p>
                </div>
              )}
            </div>

            {review.improve && (
              <div className="mt-4 rounded-2xl border border-indigo-200/60 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>{t("common.suggestedImprovements", "Đề xuất phát triển")}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {review.improve}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (35%): Participant & Session Info Cards */}
        <div className="w-full shrink-0 space-y-5 lg:w-[320px] xl:w-[350px]">
          {/* Mentor Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-3.5 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("common.mentorSent", "Mentor đánh giá")}
            </h4>
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 shrink-0 rounded-[16px] border border-slate-200/90 shadow-2xs dark:border-slate-800">
                <AvatarImage
                  src={review.mentor?.avatarUrl}
                  alt={review.mentor?.name}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-[16px] bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  {review.mentor?.name?.charAt(0)?.toUpperCase() || "M"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h5 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {review.mentor?.name || `Mentor #${review.mentor?.id || ""}`}
                </h5>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {review.mentor?.email || `ID: #${review.mentor?.id || "—"}`}
                </span>
              </div>
            </div>
          </div>

          {/* Candidate Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-3.5 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("common.candidatesAreEvaluated", "Ứng viên được đánh giá")}
            </h4>
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 shrink-0 rounded-[16px] border border-slate-200/90 shadow-2xs dark:border-slate-800">
                <AvatarImage
                  src={review.user?.avatarUrl}
                  alt={review.user?.name}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-[16px] bg-sky-50 font-bold text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                  {review.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h5 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {review.user?.name || `Candidate #${review.user?.id || ""}`}
                </h5>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {review.user?.email || `ID: #${review.user?.id || "—"}`}
                </span>
              </div>
            </div>
          </div>

          {/* Session Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("common.session", "Phiên phỏng vấn")}
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Mã phiên (Session ID)
                </span>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  #{review.session?.id || review.id}
                </span>
              </div>
              {review.session?.roomName && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Phòng phỏng vấn
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {review.session.roomName}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Ngày tham gia
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
