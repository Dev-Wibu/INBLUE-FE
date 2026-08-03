import {
  Calendar,
  CheckCircle2,
  Clock,
  Hourglass,
  Users,
  Video,
  X,
} from "lucide-react";
import type { components } from "../../../../../../schema-from-be";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

export type MentorStepKey =
  | "AWAITING_MENTOR"
  | "SELECT_MENTOR"
  | "SCHEDULE"
  | "WAITING"
  | "IN_CALL"
  | "RESULT";

export interface MentorReviewSubheaderProps {
  roundOrder?: number;
  roundLabel?: string;
  activeStep?: MentorStepKey;
  detail?: ApplicationDetail;
  isCompleted?: boolean;
  instruction?: string;
}

export function MentorReviewSubheader({
  roundOrder = 6,
  roundLabel,
  activeStep = "AWAITING_MENTOR",
  detail,
  isCompleted = false,
  instruction,
}: MentorReviewSubheaderProps) {
  const isFinished =
    isCompleted ||
    activeStep === "RESULT" ||
    detail?.status === "COMPLETED" ||
    detail?.status === "AI_EVALUATED";

  const renderIcon = () => {
    switch (activeStep) {
      case "IN_CALL":
        return <Video className="h-5 w-5" />;
      case "WAITING":
        return <Clock className="h-5 w-5" />;
      case "SCHEDULE":
        return <Calendar className="h-5 w-5" />;
      case "SELECT_MENTOR":
        return <Users className="h-5 w-5" />;
      case "AWAITING_MENTOR":
        return <Hourglass className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const getSubheaderTitle = () => {
    if (isFinished) {
      return "BÁO CÁO KẾT QUẢ ĐÁNH GIÁ MENTOR";
    }
    const name = roundLabel || "ĐÁNH GIÁ MENTOR";
    return `VÒNG ${roundOrder}: ${name.toUpperCase()} • TRẠM PHỎNG VẤN TRỰC TUYẾN`;
  };

  const getDescription = () => {
    if (isFinished) {
      return "Buổi phỏng vấn đã hoàn tất. Mentor và Hội đồng tuyển dụng đã ghi nhận nhận xét và điểm số đánh giá.";
    }
    switch (activeStep) {
      case "IN_CALL":
        return "Phòng phỏng vấn trực tuyến với Mentor đang diễn ra. Vui lòng giữ kết nối ổn định và bật camera/micro.";
      case "WAITING":
        return "Lịch phỏng vấn đã được xác nhận thành công. Vui lòng chuẩn bị và sẵn sàng tham gia đúng khung giờ đã hẹn.";
      case "SCHEDULE":
        return "Chọn ngày giờ và hình thức phỏng vấn phù hợp nhất với thời gian biểu của bạn.";
      case "SELECT_MENTOR":
        return "Chọn chuyên gia Mentor đồng hành phù hợp nhất với vị trí ứng tuyển của bạn từ danh sách đề xuất.";
      case "AWAITING_MENTOR":
      default:
        return (
          instruction ||
          "Hồ sơ đang chờ Quản trị viên chỉ định Mentor chuyên môn phù hợp cho buổi phỏng vấn của bạn."
        );
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-md backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
          {renderIcon()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              {getSubheaderTitle()}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-semibold text-indigo-400">
              Vòng {roundOrder}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-200">
            {getDescription()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {detail?.finalResult ? (
          <span
            className={
              detail.finalResult === "PASSED"
                ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm shadow-emerald-950/40"
                : "inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-4 py-1.5 text-xs font-extrabold text-rose-300 shadow-sm shadow-rose-950/40"
            }>
            {detail.finalResult === "PASSED" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <span>KẾT QUẢ: {detail.finalResult}</span>
          </span>
        ) : isFinished ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm shadow-emerald-950/40">
            <CheckCircle2 className="h-4 w-4" />
            <span>ĐÃ HOÀN THÀNH PHỎNG VẤN</span>
          </span>
        ) : activeStep === "IN_CALL" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm shadow-emerald-950/40">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
            <span>PHÒNG PHỎNG VẤN ĐANG MỞ</span>
          </span>
        ) : activeStep === "WAITING" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs font-extrabold text-amber-300 shadow-sm shadow-amber-950/40">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>ĐÃ ĐẶT LỊCH • CHỜ ĐẾN GIỜ</span>
          </span>
        ) : activeStep === "SCHEDULE" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-300 shadow-sm shadow-indigo-950/40">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            <span>ĐẶT LỊCH PHỎNG VẤN</span>
          </span>
        ) : activeStep === "SELECT_MENTOR" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-300 shadow-sm shadow-indigo-950/40">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span>CHỌN MENTOR PHÙ HỢP</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-300 shadow-sm shadow-indigo-950/40">
            <Hourglass className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
            <span>CHỜ ADMIN GÁN MENTOR</span>
          </span>
        )}
      </div>
    </div>
  );
}
