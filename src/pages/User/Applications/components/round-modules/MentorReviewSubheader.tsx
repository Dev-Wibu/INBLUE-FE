import {
  BadgeCheck,
  Calendar,
  Clock,
  Hourglass,
  TrendingUp,
  Video,
  Users,
  BadgeInfo,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface MentorReviewSubheaderProps {
  activeIndex: number;
  totalSteps: number;
}

export function MentorReviewSubheader({ activeIndex, totalSteps }: MentorReviewSubheaderProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-6 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500 dark:text-slate-400">
        <BadgeInfo className="h-4 w-4" />
        Vòng {Math.max(1, activeIndex + 1)}
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white">
        Phỏng vấn với mentor
      </h2>
      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>Vòng hiện tại</span>
      </div>
    </div>
  );
}
