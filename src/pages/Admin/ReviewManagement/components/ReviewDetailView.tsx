import { StarRating } from "@/components/ui/star-rating";
import type { MentorReview } from "@/services/mentor-review.manager";
import {
  AlertTriangle,
  ChevronLeft,
  Lightbulb,
  MessageSquare,
  Target,
  ThumbsUp,
  TrendingUp,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface ReviewDetailViewProps {
  review: MentorReview;
  onBack: () => void;
}

export function ReviewDetailView({ review, onBack }: ReviewDetailViewProps) {
  const { t } = useTranslation();

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* Header */}
      <div className="flex flex-none items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("common.reviewDetails")} #{review.id}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("common.reviewFromMentor")}{" "}
            <strong className="text-slate-700 dark:text-slate-300">{review.mentor?.name}</strong>
            {" -> "}
            {t("common.candidate")}{" "}
            <strong className="text-slate-700 dark:text-slate-300">{review.user?.name}</strong>
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Overall Rating Card */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {t("common.overallRating")}
            </h3>
            <StarRating value={review.rating || 0} readOnly size="lg" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* STAR Method Section */}
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4 text-lg font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
                <Target className="h-5 w-5 text-indigo-500" />
                {t("adminReviewmanagement.starMethodEvaluation")}
              </h3>

              {review.situationNote && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium text-emerald-600">
                    <MessageSquare className="h-4 w-4" />
                    {t("common.situation")}
                  </h4>
                  <p className="rounded-lg bg-emerald-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-emerald-900/20 dark:text-slate-300">
                    {review.situationNote}
                  </p>
                </div>
              )}

              {review.taskNote && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium text-blue-600">
                    <Target className="h-4 w-4" />
                    {t("common.mission")}
                  </h4>
                  <p className="rounded-lg bg-blue-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-blue-900/20 dark:text-slate-300">
                    {review.taskNote}
                  </p>
                </div>
              )}

              {review.actionNote && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium text-purple-600">
                    <Zap className="h-4 w-4" />
                    {t("common.act")}
                  </h4>
                  <p className="rounded-lg bg-purple-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-purple-900/20 dark:text-slate-300">
                    {review.actionNote}
                  </p>
                </div>
              )}

              {review.resultNote && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium text-amber-600">
                    <TrendingUp className="h-4 w-4" />
                    {t("common.result")}
                  </h4>
                  <p className="rounded-lg bg-amber-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-amber-900/20 dark:text-slate-300">
                    {review.resultNote}
                  </p>
                </div>
              )}
            </div>

            {/* Feedback & Improvement Section */}
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4 text-lg font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
                <UserIcon className="h-5 w-5 text-indigo-500" />
                {t("adminReviewmanagement.feedbackAndImprovement")}
              </h3>

              {review.strength && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium text-green-600">
                    <ThumbsUp className="h-4 w-4" />
                    {t("common.strengths")}
                  </h4>
                  <p className="rounded-lg bg-green-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-green-900/20 dark:text-slate-300">
                    {review.strength}
                  </p>
                </div>
              )}

              {review.weakness && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    {t("adminReviewmanagement.weakness")}
                  </h4>
                  <p className="rounded-lg bg-red-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-red-900/20 dark:text-slate-300">
                    {review.weakness}
                  </p>
                </div>
              )}

              {review.improve && (
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-medium text-indigo-600">
                    <Lightbulb className="h-4 w-4" />
                    {t("common.suggestedImprovements")}
                  </h4>
                  <p className="rounded-lg bg-indigo-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-indigo-900/20 dark:text-slate-300">
                    {review.improve}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
