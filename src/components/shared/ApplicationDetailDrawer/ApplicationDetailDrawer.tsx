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
  ExternalLink,
  FileText,
  Mail,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface ApplicationDetailDrawerProps {
  applicationId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

export function ApplicationDetailDrawer({
  applicationId,
  isOpen,
  onClose,
}: ApplicationDetailDrawerProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<AdminApplicationFullDetailResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && applicationId) {
      loadDetail(applicationId);
    } else {
      setDetail(null);
    }
  }, [isOpen, applicationId]);

  const loadDetail = async (id: number) => {
    setIsLoading(true);
    const res = await adminApplicationManager.getApplicationFullDetail(id);
    if (res.success && res.data) {
      setDetail(res.data);
    } else {
      toast.error(res.error || t("common.unableToLoadData", "Không thể tải chi tiết đơn ứng tuyển"));
    }
    setIsLoading(false);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PASSED":
      case "ACCEPTED":
      case "COMPLETED":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400">ĐẠT (PASSED)</Badge>;
      case "REJECTED":
      case "FAILED":
        return <Badge variant="destructive">TỪ CHỐI (REJECTED)</Badge>;
      case "IN_PROGRESS":
      case "PENDING":
      default:
        return <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400">ĐANG XỬ LÝ</Badge>;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-slate-50 dark:bg-slate-950">
        <SheetHeader className="p-6 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4 pr-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Briefcase className="h-3.5 w-3.5" />
                <span>Đơn ứng tuyển #{applicationId}</span>
              </div>
              <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {detail?.candidateName || detail?.applicantName || "Chi tiết đơn ứng tuyển"}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ứng tuyển vị trí: <strong className="text-slate-700 dark:text-slate-300">{detail?.jobTitle || detail?.jdTitle || "Chưa xác định"}</strong>
              </SheetDescription>
            </div>
            {getStatusBadge(detail?.status)}
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
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-500" />
                  Thông tin ứng viên
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{detail?.candidateEmail || detail?.email || "Chưa có Email"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{detail?.candidatePhone || detail?.phone || "Chưa có SDT"}</span>
                  </div>
                  {detail?.major && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Ngành: {detail.major}</span>
                    </div>
                  )}
                  {detail?.experienceYears !== undefined && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Kinh nghiệm: {detail.experienceYears} năm</span>
                    </div>
                  )}
                </div>

                {(detail?.cvUrl || detail?.resumeUrl) && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      File CV ứng tuyển
                    </span>
                    <a
                      href={detail.cvUrl || detail.resumeUrl}
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
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Điểm tổng</span>
                  <div className="mt-1 text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                    {detail?.overallScore !== undefined ? `${detail.overallScore} / 100` : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Vòng hiện tại</span>
                  <div className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {detail?.currentRoundName || detail?.currentRoundOrder ? `Vòng ${detail.currentRoundOrder}` : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Trạng thái</span>
                  <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {detail?.status || "IN_PROGRESS"}
                  </div>
                </div>
              </div>

              {/* 3. Chi tiết kết quả từng vòng tuyển dụng */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  Kết quả từng vòng thi ({detail?.roundDetails?.length || 0} vòng)
                </h4>

                {detail?.roundDetails && detail.roundDetails.length > 0 ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {detail.roundDetails.map((round: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
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
                          <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                            <strong className="text-slate-800 dark:text-slate-200">Đánh giá AI: </strong>
                            {round.aiFeedback}
                          </div>
                        )}

                        {round.hrNotes && (
                          <div className="rounded-lg bg-indigo-50/40 p-2.5 text-xs text-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50">
                            <strong className="text-indigo-800 dark:text-indigo-300">Ghi chú HR: </strong>
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

        <div className="p-4 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Đóng
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
