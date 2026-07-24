import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  adminApplicationManager,
  type AdminApplicationFullDetailResponseDto,
} from "@/services/admin-application.manager";
import {
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Mail,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface ApplicationDetailDrawerProps {
  applicationId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

function renderAiFeedback(feedback: any) {
  if (!feedback) return null;

  let content: any = feedback;
  if (typeof feedback === "string") {
    try {
      content = JSON.parse(feedback);
    } catch {
      return feedback;
    }
  }

  if (typeof content === "object" && content !== null) {
    if (content.generalComment || content.strengths || content.weaknesses) {
      return (
        <div className="mt-1 space-y-1.5">
          {content.generalComment && (
            <p className="font-medium text-slate-700 dark:text-slate-300">
              {typeof content.generalComment === "string"
                ? content.generalComment
                : JSON.stringify(content.generalComment)}
            </p>
          )}
          {Array.isArray(content.strengths) && content.strengths.length > 0 && (
            <div className="text-emerald-600 dark:text-emerald-400">
              <strong>Điểm mạnh:</strong> {content.strengths.join(", ")}
            </div>
          )}
          {Array.isArray(content.weaknesses) && content.weaknesses.length > 0 && (
            <div className="text-amber-600 dark:text-amber-400">
              <strong>Cần cải thiện:</strong> {content.weaknesses.join(", ")}
            </div>
          )}
        </div>
      );
    }
    return JSON.stringify(content);
  }

  return String(content);
}

export function ApplicationDetailDrawer({
  applicationId,
  isOpen,
  onClose,
}: ApplicationDetailDrawerProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<AdminApplicationFullDetailResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDetail = useCallback(
    async (id: number) => {
      setIsLoading(true);
      const res = await adminApplicationManager.getApplicationFullDetail(id);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        toast.error(
          res.error || t("common.unableToLoadData", "Không thể tải chi tiết đơn ứng tuyển")
        );
      }
      setIsLoading(false);
    },
    [t]
  );

  useEffect(() => {
    if (isOpen && applicationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDetail(applicationId);
    } else {
      setDetail(null);
    }
  }, [isOpen, applicationId, loadDetail]);

  const getStatusBadge = (status?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    switch (status as any) {
      case "PASSED":
      case "ACCEPTED":
      case "COMPLETED":
        return (
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            ĐẠT (PASSED)
          </Badge>
        );
      case "REJECTED":
      case "FAILED":
        return <Badge variant="destructive">TỪ CHỐI (REJECTED)</Badge>;
      case "IN_PROGRESS":
      case "PENDING":
      default:
        return (
          <Badge
            variant="secondary"
            className="border-amber-500/30 bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            ĐANG XỬ LÝ
          </Badge>
        );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col bg-slate-50 p-0 sm:max-w-xl md:max-w-2xl dark:bg-slate-950">
        <SheetHeader className="border-b border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4 pr-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Briefcase className="h-3.5 w-3.5" />
                <span>Đơn ứng tuyển #{applicationId}</span>
              </div>
              <SheetTitle className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {detail?.candidateInfo?.name || "Chi tiết đơn ứng tuyển"}
              </SheetTitle>
              <SheetDescription className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Ứng tuyển vị trí:{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {detail?.jobDescriptionInfo?.title || "Chưa xác định"}
                </strong>
              </SheetDescription>
            </div>
            {getStatusBadge(detail?.applicationOverview?.status)}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : detail ? (
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* 1. Thông tin cá nhân ứng viên */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  <User className="h-3.5 w-3.5 text-indigo-500" />
                  Thông tin ứng viên
                </h4>

                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">
                      {detail?.candidateInfo?.email || "Chưa có Email"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{"Chưa có SDT"}</span>
                  </div>
                  {detail?.candidateInfo?.targetRole && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>Vị trí mục tiêu: {detail.candidateInfo.targetRole}</span>
                    </div>
                  )}
                  {detail?.candidateInfo?.targetLevel && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Award className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>Cấp độ: {detail.candidateInfo.targetLevel}</span>
                    </div>
                  )}
                </div>

                {detail?.candidateInfo?.cvUrl && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800/60">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      File CV ứng tuyển
                    </span>
                    <a
                      href={detail.candidateInfo.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400">
                      <Download className="h-3.5 w-3.5" />
                      Xem / Tải CV PDF
                    </a>
                  </div>
                )}
              </div>

              {/* 2. Điểm số tổng quan */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">
                    Điểm tổng
                  </span>
                  <div className="mt-1 text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                    {detail?.applicationOverview?.overallScore !== undefined
                      ? `${detail.applicationOverview.overallScore} / 100`
                      : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">
                    Vòng hiện tại
                  </span>
                  <div className="mt-1 truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                    {detail?.applicationOverview?.currentRoundName ||
                      (detail?.applicationOverview?.currentRoundOrder
                        ? `Vòng ${detail.applicationOverview.currentRoundOrder}`
                        : "—")}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">
                    Trạng thái
                  </span>
                  <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {detail?.applicationOverview?.status || "IN_PROGRESS"}
                  </div>
                </div>
              </div>

              {/* 3. Chi tiết kết quả từng vòng tuyển dụng */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  Kết quả từng vòng thi ({detail?.roundDetails?.length || 0} vòng)
                </h4>

                {detail?.roundDetails && detail.roundDetails.length > 0 ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {detail.roundDetails.map((round: any, idx: number) => (
                      <div
                        key={idx}
                        className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                              {idx + 1}
                            </span>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                              {round.roundName || round.name || `Vòng ${idx + 1}`}
                            </h5>
                          </div>
                          <div className="flex items-center gap-2">
                            {round.score !== undefined && (
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                {round.score} / 100 điểm
                              </span>
                            )}
                            {round.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-500" />
                            )}
                          </div>
                        </div>

                        {round.aiFeedback && (
                          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                            <strong className="text-slate-800 dark:text-slate-200">
                              Đánh giá AI:{" "}
                            </strong>
                            {renderAiFeedback(round.aiFeedback)}
                          </div>
                        )}

                        {round.hrNotes && (
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-2.5 text-xs text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200">
                            <strong className="text-indigo-800 dark:text-indigo-300">
                              Ghi chú HR:{" "}
                            </strong>
                            {round.hrNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                    <AlertCircle className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                    Chưa có kết quả vòng thi chi tiết.
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-xs text-slate-400">
            Không tìm thấy thông tin đơn ứng tuyển.
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Đóng
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
