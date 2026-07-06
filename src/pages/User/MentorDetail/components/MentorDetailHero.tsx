import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SchemaMentorResponse } from "@/interfaces/schema.types";
import { cn } from "@/lib/utils";
import { ArrowLeft, Briefcase, Sparkles, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
interface MentorDetailHeroProps {
  mentor: SchemaMentorResponse;
  onBack: () => void;
  onAvatarClick?: () => void;
}
export function MentorDetailHero({ mentor, onBack, onAvatarClick }: MentorDetailHeroProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("userMentordetail.returnToMentorList")}
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <Avatar
          className={cn(
            "h-24 w-24 border-4 border-white shadow-lg dark:border-slate-800",
            onAvatarClick && mentor.avatarUrl
              ? "cursor-pointer transition-transform hover:scale-105"
              : ""
          )}
          onClick={() => {
            if (onAvatarClick && mentor.avatarUrl) {
              onAvatarClick();
            }
          }}>
          <AvatarImage src={mentor.avatarUrl || ""} alt={mentor.name || t("common.mentor")} />
          <AvatarFallback className="bg-slate-100 text-3xl font-black text-slate-500 dark:bg-slate-800 dark:text-slate-200">
            {mentor.name?.charAt(0) || "M"}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl dark:text-white">
              {mentor.name || t("common.mentor")}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {mentor.expertise || t("userMentordetail.expertiseNotUpdated")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <Briefcase className="mr-1 h-3.5 w-3.5" />
              {mentor.currentCompany || t("common.freelanceMentor")}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <Users className="mr-1 h-3.5 w-3.5" />
              {mentor.totalSession || 0} {t("common.session1")}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              {mentor.yearsOfExperience || 0} {t("userMentordetail.yearsOfExperience")}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
