import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Banknote, CheckCircle2, Sparkles, Star, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
interface MentorHighlightsProps {
  highlights: string[];
  slaEstimate: string;
  ratingText: string | null;
  totalSessions: number;
  priceText: string | null;
  expertiseTags: string[];
  hasRating: boolean;
  hasPrice: boolean;
}
export function MentorHighlights({
  highlights,
  slaEstimate,
  ratingText,
  totalSessions,
  priceText,
  expertiseTags,
  hasRating,
  hasPrice,
}: MentorHighlightsProps) {
  const { t } = useTranslation();
  return (
    <Card className="space-y-4 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        {t("userMentordetail.mentorOverview")}
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        {hasPrice && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Banknote className="h-3.5 w-3.5" />
              {t("userMentordetail.consultingPrice")}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{priceText}</p>
          </div>
        )}

        {hasRating && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Star className="h-3.5 w-3.5 fill-current" />
              {t("userMentordetail.rating")}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              {ratingText}/5
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Users className="h-3.5 w-3.5" />
            {t("userMentordetail.sessionsAccompanied")}
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
            {totalSessions} {t("common.session1")}
          </p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {highlights.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {expertiseTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("userMentordetail.professionalGroup")}
          </p>
          <div className="flex flex-wrap gap-2">
            {expertiseTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-full border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
        <span>{slaEstimate}</span>
      </div>
    </Card>
  );
}
