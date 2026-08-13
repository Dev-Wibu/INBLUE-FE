import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { useMentorFeedbacks } from "@/hooks/useMentorFeedback";
import { formatDate } from "@/lib/formatting";
import type { MentorReview } from "@/services/mentor-review.manager";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  MessageSquareQuote,
  Sparkles,
  Star,
  Target,
  ThumbsUp,
  TrendingUp,
  User,
  Video,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface ReviewDetailViewProps {
  review: MentorReview;
  onBack: () => void;
}

const getRatingLabel = (rating: number) => {
  if (rating >= 5) return "Xuất sắc";
  if (rating >= 4) return "Rất tốt";
  if (rating >= 3) return "Đạt yêu cầu";
  if (rating >= 2) return "Cần cố gắng";
  return "Chưa đạt";
};

export function ReviewDetailView({ review, onBack }: ReviewDetailViewProps) {
  const { t } = useTranslation();

  // Fetch all candidate feedbacks to match with current session
  const { data: candidateFeedbacks = [] } = useMentorFeedbacks();

  const joinDate =
    review.session?.joinTime ||
    review.session?.startTime1 ||
    (review as Record<string, unknown>).createdAt ||
    (review as Record<string, unknown>).created_at ||
    review.session?.createdAt ||
    review.session?.created_at;

  const formattedDate = joinDate ? formatDate(String(joinDate)) : "—";

  // Match candidate feedback for the same session or candidate/mentor pair
  const matchingCandidateFeedback = useMemo(() => {
    if (!candidateFeedbacks || candidateFeedbacks.length === 0) return null;

    const sessionId =
      review.session?.id ||
      (review as Record<string, unknown>).sessionId ||
      (review as Record<string, unknown>).session_id;

    if (sessionId) {
      const match = candidateFeedbacks.find(
        (f) =>
          f.session?.id === sessionId ||
          (f as Record<string, unknown>).sessionId === sessionId ||
          (f as Record<string, unknown>).session_id === sessionId
      );
      if (match) return match;
    }

    // Fallback match by mentor & user IDs
    const mentorId = review.mentor?.id;
    const userId = review.user?.id;
    if (mentorId && userId) {
      return (
        candidateFeedbacks.find(
          (f) =>
            (f.mentor?.id === mentorId || (f as Record<string, unknown>).mentorId === mentorId) &&
            (f.user?.id === userId || (f as Record<string, unknown>).userId === userId)
        ) || null
      );
    }

    return null;
  }, [candidateFeedbacks, review]);

  const starItems = [
    {
      key: "situation",
      letter: "S",
      title: t("common.situation", "Bối cảnh (Situation)"),
      icon: MessageSquare,
      content: review.situationNote,
      color:
        "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800",
    },
    {
      key: "task",
      letter: "T",
      title: t("common.mission", "Nhiệm vụ (Task)"),
      icon: Target,
      content: review.taskNote,
      color:
        "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800",
    },
    {
      key: "action",
      letter: "A",
      title: t("common.act", "Hành động (Action)"),
      icon: Zap,
      content: review.actionNote,
      color:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800",
    },
    {
      key: "result",
      letter: "R",
      title: t("common.result", "Kết quả (Result)"),
      icon: TrendingUp,
      content: review.resultNote,
      color:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800",
    },
  ].filter((item) => Boolean(item.content));

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      {/* ── TOP SUBHEADER BAR ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>{t("common.back", "Quay lại")}</span>
          </Button>

          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800" />

          <span
            onClick={onBack}
            className="cursor-pointer text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
            {t("common.reviewFromMentor", "Đánh giá & Phản hồi")}
          </span>

          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />

          <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
            Chi tiết phiên phỏng vấn #{review.session?.id || review.id}
          </h1>
        </div>
      </div>

      {/* ── MAIN CONTENT 2-COLUMN DASHBOARD ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column (8/12 - 66%): Direct Sequence (No Tabs) */}
        <div className="space-y-8 lg:col-span-8">
          {/* SECTION 1: STAR Timeline Section */}
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span>Đánh giá từ Mentor (Mô hình STAR)</span>
              </h2>
            </div>

            {starItems.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Chưa có ghi chú STAR cho đánh giá này.
              </p>
            ) : (
              <div className="relative space-y-6 pl-8 before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {starItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="relative flex gap-4">
                      <div
                        className={`absolute -left-8 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold shadow-2xs ${item.color}`}>
                        {item.letter}
                      </div>

                      <div className="flex-1 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                        <div className="mb-2.5 flex items-center gap-2">
                          <Icon className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: Feedback & Improvement Section */}
          <div className="space-y-5">
            <h2 className="flex items-center gap-2 border-b border-slate-200/80 pb-3 text-base font-bold text-slate-900 dark:border-slate-800/80 dark:text-white">
              <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Nhận xét chuyên sâu & Định hướng phát triển</span>
            </h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {review.strength && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                  <div className="mb-2.5 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <ThumbsUp className="h-4 w-4" />
                    <span>Điểm mạnh nổi bật</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {review.strength}
                  </p>
                </div>
              )}

              {review.weakness && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                  <div className="mb-2.5 flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Điểm cần cải thiện</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {review.weakness}
                  </p>
                </div>
              )}
            </div>

            {review.improve && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                <div className="mb-2.5 flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Lightbulb className="h-4 w-4" />
                  <span>Đề xuất lộ trình phát triển</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {review.improve}
                </p>
              </div>
            )}
          </div>

          {/* SECTION 3: Candidate Feedback Section */}
          <div className="space-y-5">
            <h2 className="flex items-center gap-2 border-b border-slate-200/80 pb-3 text-base font-bold text-slate-900 dark:border-slate-800/80 dark:text-white">
              <MessageSquareQuote className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              <span>Phản hồi & Cảm nhận từ Ứng viên</span>
            </h2>

            {matchingCandidateFeedback ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:flex-row dark:border-slate-800/80 dark:bg-slate-900">
                  <div className="flex items-center gap-3.5">
                    <Avatar className="h-11 w-11 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800">
                      <AvatarImage
                        src={matchingCandidateFeedback.user?.avatarUrl}
                        alt={matchingCandidateFeedback.user?.name}
                      />
                      <AvatarFallback className="rounded-[14px] bg-sky-50 font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        {matchingCandidateFeedback.user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {matchingCandidateFeedback.user?.name || "Ứng viên"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Khảo sát chất lượng phiên phỏng vấn
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StarRating
                      value={matchingCandidateFeedback.rating || 0}
                      readOnly
                      size="md"
                      color="sky"
                    />
                    <Badge
                      variant="outline"
                      className="border-sky-200/80 bg-sky-50/80 text-xs font-bold text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/60 dark:text-sky-300">
                      {getRatingLabel(matchingCandidateFeedback.rating || 0)}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                  {matchingCandidateFeedback.comment ? (
                    <blockquote className="rounded-xl border-l-4 border-sky-500 bg-sky-50/40 p-4 text-sm leading-relaxed text-slate-700 italic dark:border-sky-400 dark:bg-sky-950/20 dark:text-slate-300">
                      "{matchingCandidateFeedback.comment}"
                    </blockquote>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Ứng viên đã hoàn tất chấm điểm {matchingCandidateFeedback.rating}/5 sao và
                      không để lại nhận xét thêm.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Ứng viên chưa hoàn tất gửi phản hồi cho phiên phỏng vấn này.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4/12 - 34%): Executive Dual-Rating Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          {/* Dual Rating Showcase Card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/60">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Đánh giá tổng quan phiên
              </h3>
            </div>

            <div className="space-y-4">
              {/* Mentor rating */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-950/40">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">
                    Mentor chấm Ứng viên
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <StarRating value={review.rating || 5} readOnly size="sm" color="amber" />
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {review.rating || 0}.0/5
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-200/80 bg-amber-50/80 text-[11px] font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300">
                  {getRatingLabel(review.rating || 0)}
                </Badge>
              </div>

              {/* Candidate rating */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-950/40">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">
                    Ứng viên chấm Mentor
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {matchingCandidateFeedback ? (
                      <>
                        <StarRating
                          value={matchingCandidateFeedback.rating || 0}
                          readOnly
                          size="sm"
                          color="sky"
                        />
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                          {matchingCandidateFeedback.rating || 0}.0/5
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Chưa đánh giá</span>
                    )}
                  </div>
                </div>
                {matchingCandidateFeedback && (
                  <Badge
                    variant="outline"
                    className="border-sky-200/80 bg-sky-50/80 text-[11px] font-bold text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/60 dark:text-sky-300">
                    {getRatingLabel(matchingCandidateFeedback.rating || 0)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Session Overview & Participants Panel */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
            <h3 className="mb-5 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              <Video className="h-4 w-4 text-indigo-500" />
              <span>Thông tin phiên & Đối tượng</span>
            </h3>

            <div className="space-y-6">
              {/* Session Details Box */}
              <div className="space-y-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4.5 dark:border-slate-800/80 dark:bg-slate-950/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Mã phiên phỏng vấn
                  </span>
                  <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
                    #{review.session?.id || review.id}
                  </span>
                </div>

                {review.session?.roomName && (
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Phòng phỏng vấn</span>
                    <span className="truncate font-mono font-bold text-slate-900 dark:text-white">
                      {review.session.roomName}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Thời gian tham gia</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {formattedDate}
                  </span>
                </div>
              </div>

              {/* Mentor Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Mentor phỏng vấn
                  </span>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Chấm thi
                  </span>
                </div>
                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-950/50">
                  <Avatar className="h-11 w-11 shrink-0 rounded-[16px] border border-slate-200/90 shadow-2xs dark:border-slate-800">
                    <AvatarImage
                      src={review.mentor?.avatarUrl}
                      alt={review.mentor?.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-[16px] bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {review.mentor?.name?.charAt(0)?.toUpperCase() || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {review.mentor?.name || "Mentor"}
                    </h4>
                    <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                      {review.mentor?.email || `ID: #${review.mentor?.id || "—"}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Candidate Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Ứng viên tham gia
                  </span>
                  <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    Phỏng vấn
                  </span>
                </div>
                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-950/50">
                  <Avatar className="h-11 w-11 shrink-0 rounded-[16px] border border-slate-200/90 shadow-2xs dark:border-slate-800">
                    <AvatarImage
                      src={review.user?.avatarUrl}
                      alt={review.user?.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-[16px] bg-sky-50 font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      {review.user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {review.user?.name || "Ứng viên"}
                    </h4>
                    <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
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
