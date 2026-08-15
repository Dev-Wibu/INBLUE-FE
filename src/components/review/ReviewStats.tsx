import { useTranslation } from "react-i18next";
/**
 * ReviewStats Component
 * Displays review statistics (average rating, count, distribution)
 */

import { TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateAverageMentorScore } from "@/hooks/useMentorReview";
import { matchesMentorReviewScoreRange } from "@/lib/mentor-review-score";
import { cn } from "@/lib/utils";
import type { MentorReview } from "@/services/mentor-review.manager";

interface ReviewStatsProps {
  reviews: MentorReview[];
  showDistribution?: boolean;
  compact?: boolean;
  className?: string;
}

export function ReviewStats({
  reviews,
  showDistribution = true,
  compact = false,
  className,
}: ReviewStatsProps) {
  const { t } = useTranslation();
  const totalReviews = reviews.length;
  const averageScore = calculateAverageMentorScore(reviews);

  const distribution = [
    { key: "excellent" as const, label: "90-100" },
    { key: "strong" as const, label: "75-89" },
    { key: "meets" as const, label: "60-74" },
    { key: "developing" as const, label: "0-59" },
  ].map((range) => ({
    ...range,
    count: reviews.filter((review) => matchesMentorReviewScoreRange(review.rating, range.key))
      .length,
    percentage:
      totalReviews > 0
        ? (reviews.filter((review) => matchesMentorReviewScoreRange(review.rating, range.key))
            .length /
            totalReviews) *
          100
        : 0,
  }));

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <span className="text-lg font-bold tabular-nums">{averageScore.toFixed(1)}/100</span>
        <span className="text-sm text-slate-500">
          ({totalReviews} {t("general.ratings")}
        </span>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "rounded-2xl border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90",
        className
      )}>
      <CardHeader className="px-0 pt-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
          <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          {t("compReview.evaluationStatistics")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Average score */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/80 p-4 sm:min-w-[150px] dark:border-indigo-800/50 dark:bg-indigo-950/30">
            <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
              {averageScore.toFixed(1)}
            </span>
            <span className="mt-1 text-xs font-bold text-indigo-600/70 dark:text-indigo-300/70">
              /100
            </span>
            <span className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              {totalReviews} {t("compReview.evaluate")}
            </span>
          </div>

          {/* Distribution */}
          {showDistribution && (
            <div className="flex-1 space-y-2">
              {distribution.map(({ key, label, count, percentage }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-14 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {label}
                  </span>
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="w-8 text-right text-sm font-medium text-slate-500 dark:text-slate-400">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
