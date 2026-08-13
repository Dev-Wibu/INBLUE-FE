import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatting";
import type { MentorReview } from "@/services/mentor-review.manager";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  Sparkles,
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

  const starItems = [
    {
      key: "situation",
      letter: "S",
      title: t("common.situation", "Bối cảnh (Situation)"),
      icon: MessageSquare,
      content: review.situationNote,
      color:
        "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800/60",
      lineColor: "bg-indigo-200 dark:bg-indigo-900/60",
    },
    {
      key: "task",
      letter: "T",
      title: t("common.mission", "Nhiệm vụ (Task)"),
      icon: Target,
      content: review.taskNote,
      color:
        "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/60",
      lineColor: "bg-sky-200 dark:bg-sky-900/60",
    },
    {
      key: "action",
      letter: "A",
      title: t("common.act", "Hành động (Action)"),
      icon: Zap,
      content: review.actionNote,
      color:
        "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/60",
      lineColor: "bg-purple-200 dark:bg-purple-900/60",
    },
    {
      key: "result",
      letter: "R",
      title: t("common.result", "Kết quả (Result)"),
      icon: TrendingUp,
      content: review.resultNote,
      color:
        "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60",
      lineColor: "bg-amber-200 dark:bg-amber-900/60",
    },
  ].filter((item) => Boolean(item.content));

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      {/* ── TOP HERO HEADER (SINGLE FLAT BANNER) ── */}
      <div className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 md:flex-row md:items-center dark:border-slate-800/80 dark:bg-slate-900">
        {/* Left: Participant Pairing */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">{t("common.back", "Quay lại")}</span>
          </Button>

          <div className="flex items-center gap-3">
            {/* Mentor */}
            <div className="flex items-center gap-2.5">
              <Avatar className="h-10 w-10 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800">
                <AvatarImage
                  src={review.mentor?.avatarUrl}
                  alt={review.mentor?.name}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-[14px] bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  {review.mentor?.name?.charAt(0)?.toUpperCase() || "M"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  Mentor
                </p>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {review.mentor?.name || `Mentor #${review.mentor?.id || ""}`}
                </p>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />

            {/* Candidate */}
            <div className="flex items-center gap-2.5">
              <Avatar className="h-10 w-10 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800">
                <AvatarImage
                  src={review.user?.avatarUrl}
                  alt={review.user?.name}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-[14px] bg-sky-50 font-bold text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                  {review.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  Ứng viên
                </p>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {review.user?.name || `Ứng viên #${review.user?.id || ""}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Rating Summary & Actions */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-1.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                {review.rating || 0}.0
              </span>
              <span className="text-xs font-medium text-slate-400">/ 5.0</span>
            </div>
            <Badge
              variant="outline"
              className="border-amber-200/80 bg-amber-50/80 text-[11px] font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300">
              {getRatingLabel(review.rating || 0)}
            </Badge>
          </div>

          {onDelete && (
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              className="h-9 gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-950/50 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/50">
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t("common.delete", "Xóa")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── MAIN LAYOUT: TIMELINE FLOW + SIDEBAR ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8/12 - 66%): Timeline STAR Analysis */}
        <div className="space-y-6 lg:col-span-8">
          {/* STAR Timeline Section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Quy trình đánh giá phương pháp STAR</span>
              </h2>
              <span className="text-xs font-medium text-slate-400">Ngày tạo: {formattedDate}</span>
            </div>

            {starItems.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có ghi chú STAR cho đánh giá này.</p>
            ) : (
              <div className="relative space-y-6 pl-6 before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {starItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="relative flex gap-4">
                      {/* Timeline Node Icon */}
                      <div
                        className={`absolute -left-6 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${item.color}`}>
                        {item.letter}
                      </div>

                      {/* Content Block */}
                      <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                        <div className="mb-2 flex items-center gap-2">
                          <Icon className="h-4 w-4 text-indigo-500" />
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Feedback & Improvement Section (Strengths / Weaknesses / Improvements) */}
          <div className="space-y-4 pt-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Nhận xét chuyên sâu & Định hướng phát triển</span>
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {review.strength && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <ThumbsUp className="h-4 w-4" />
                    <span>Điểm mạnh nổi bật</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {review.strength}
                  </p>
                </div>
              )}

              {review.weakness && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Điểm cần cải thiện</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {review.weakness}
                  </p>
                </div>
              )}
            </div>

            {review.improve && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Lightbulb className="h-4 w-4" />
                  <span>Đề xuất lộ trình phát triển</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {review.improve}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4/12 - 34%): Unified Overview Panel */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900">
            <h3 className="mb-4 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Thông tin tổng quan phiên
            </h3>

            <div className="space-y-4">
              {/* Session ID & Room */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Mã phiên (Session)</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    #{review.session?.id || review.id}
                  </span>
                </div>
                {review.session?.roomName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Phòng họp</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {review.session.roomName}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Ngày tham gia</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formattedDate}
                  </span>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800/60" />

              {/* Mentor Contact */}
              <div>
                <p className="mb-2 text-[11px] font-bold text-slate-400 uppercase">Mentor</p>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0 rounded-xl border border-slate-200/90 dark:border-slate-800">
                    <AvatarImage src={review.mentor?.avatarUrl} alt={review.mentor?.name} />
                    <AvatarFallback className="rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {review.mentor?.name?.charAt(0)?.toUpperCase() || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {review.mentor?.name || "Mentor"}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {review.mentor?.email || `ID: #${review.mentor?.id || "—"}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800/60" />

              {/* Candidate Contact */}
              <div>
                <p className="mb-2 text-[11px] font-bold text-slate-400 uppercase">Ứng viên</p>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0 rounded-xl border border-slate-200/90 dark:border-slate-800">
                    <AvatarImage src={review.user?.avatarUrl} alt={review.user?.name} />
                    <AvatarFallback className="rounded-xl bg-sky-50 text-xs font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      {review.user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {review.user?.name || "Ứng viên"}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {review.user?.email || `ID: #${review.user?.id || "—"}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
