import { KioskStatusBadge } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { kioskManager, type KioskHistoryResponseDto } from "@/services/kiosk.manager";
import { format } from "date-fns";
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  History,
  Key,
  MapPin,
  RefreshCw,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Kiosk } from "../types";

interface KioskHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kiosk: Kiosk | null;
}

export function KioskHistoryDialog({ open, onOpenChange, kiosk }: KioskHistoryDialogProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<KioskHistoryResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadHistory = useCallback(async () => {
    if (!kiosk?.id) return;
    setLoading(true);
    try {
      const res = await kioskManager.getKioskHistory(kiosk.id);
      if (res.success && res.data) {
        setHistory(res.data);
      } else {
        toast.error(res.error || t("common.unableToLoadData"));
        setHistory([]);
      }
    } catch (err) {
      console.error("[KioskHistoryDialog] Error fetching history:", err);
      toast.error(t("common.unableToLoadData"));
    } finally {
      setLoading(false);
    }
  }, [kiosk?.id, t]);

  useEffect(() => {
    if (open && kiosk?.id) {
      void loadHistory();
    } else {
      setHistory([]);
      setSearchQuery("");
      setStatusFilter("ALL");
    }
  }, [open, kiosk?.id, loadHistory]);

  const stats = useMemo(() => {
    const total = history.length;
    const completed = history.filter((h) => h.status === "COMPLETED").length;
    const inProgress = history.filter((h) =>
      ["IN_PROGRESS", "ROOM_CREATED", "AWAITING_MENTOR", "MENTOR_ASSIGNED"].includes(h.status || "")
    ).length;
    const cancelled = history.filter((h) => h.status === "CANCELLED").length;
    return { total, completed, inProgress, cancelled };
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Filter by status
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      // Filter by search query
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      const candidateName = item.candidateInfo?.fullName?.toLowerCase() || "";
      const candidateEmail = item.candidateInfo?.email?.toLowerCase() || "";
      const jobTitle = item.jobDescriptionInfo?.title?.toLowerCase() || "";
      const sessionKey = item.sessionKey?.toLowerCase() || "";
      const bookingId = String(item.bookingId || "");

      return (
        candidateName.includes(query) ||
        candidateEmail.includes(query) ||
        jobTitle.includes(query) ||
        sessionKey.includes(query) ||
        bookingId.includes(query)
      );
    });
  }, [history, searchQuery, statusFilter]);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm");
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-2xl dark:border-slate-800 [&>button]:hidden">
        <DialogHeader className="hidden">
          <DialogTitle>Lịch sử trạm Kiosk</DialogTitle>
          <DialogDescription>Lịch sử đặt lịch và tham gia của trạm Kiosk</DialogDescription>
        </DialogHeader>

        {/* ── HEADER BAR ──────────────────────────────────────────────────────── */}
        <div className="flex flex-none items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {kiosk?.name || "Trạm Kiosk"}
                </h2>
                <Badge
                  variant="outline"
                  className="gap-1 border-slate-200 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
                  <MapPin className="h-3 w-3 text-rose-500" />
                  {kiosk?.location || "Không xác định"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lịch sử đặt lịch và tham gia phỏng vấn qua trạm Kiosk này
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadHistory()}
              disabled={loading}
              className="h-8 gap-1.5 border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* ── METRICS SUMMARY BAR ────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 border-b border-slate-200/80 bg-slate-50/50 p-4 px-6 dark:border-slate-800/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white p-3 shadow-xs dark:border-slate-800/60 dark:bg-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase">Tổng lượt đặt</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white p-3 shadow-xs dark:border-slate-800/60 dark:bg-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase">Hoàn thành</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {stats.completed}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white p-3 shadow-xs dark:border-slate-800/60 dark:bg-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase">Đang xử lý / Chờ</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {stats.inProgress}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white p-3 shadow-xs dark:border-slate-800/60 dark:bg-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <XCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase">Đã hủy</p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {stats.cancelled}
              </p>
            </div>
          </div>
        </div>

        {/* ── TOOLBAR (SEARCH & FILTER) ────────────────────────────────────── */}
        <div className="flex flex-none items-center justify-between border-b border-slate-200/60 bg-white px-6 py-3 dark:border-slate-800/60 dark:bg-slate-900">
          <div className="relative w-72">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm theo ứng viên, vị trí, mã..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs focus-visible:ring-indigo-500"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5">
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "COMPLETED", label: "Hoàn thành" },
              { id: "IN_PROGRESS", label: "Đang diễn ra" },
              { id: "AWAITING_MENTOR", label: "Chờ mentor" },
              { id: "CANCELLED", label: "Đã hủy" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === f.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENT AREA (TABLE) ────────────────────────────────────────── */}
        <div className="max-h-[50vh] flex-1 overflow-y-auto bg-white dark:bg-slate-950">
          {loading ? (
            <div className="flex h-64 items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Đang tải lịch sử trạm Kiosk...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
                <History className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">Chưa có lịch sử đặt lịch nào.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                  <TableHead className="w-[80px] pl-6 font-medium text-slate-500">
                    Mã Lịch
                  </TableHead>
                  <TableHead className="min-w-[220px] font-medium text-slate-500">
                    Ứng viên
                  </TableHead>
                  <TableHead className="min-w-[180px] font-medium text-slate-500">
                    Vị trí phỏng vấn
                  </TableHead>
                  <TableHead className="w-[180px] font-medium text-slate-500">
                    Thời gian phỏng vấn
                  </TableHead>
                  <TableHead className="w-[140px] font-medium text-slate-500">Trạng thái</TableHead>
                  <TableHead className="w-[130px] pr-6 font-medium text-slate-500">
                    Session Key / Ghi chú
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((item) => (
                  <TableRow
                    key={item.bookingId || Math.random()}
                    className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                    <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                      #{item.bookingId}
                    </TableCell>

                    {/* Candidate */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800">
                          <AvatarImage
                            src={item.candidateInfo?.avatar || undefined}
                            alt={item.candidateInfo?.fullName || "Candidate"}
                          />
                          <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {item.candidateInfo?.fullName?.charAt(0) || (
                              <User className="h-3.5 w-3.5" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {item.candidateInfo?.fullName || "Ứng viên ẩn danh"}
                          </p>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {item.candidateInfo?.email || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Job Position */}
                    <TableCell>
                      <p
                        className="truncate text-xs font-medium text-slate-800 dark:text-slate-200"
                        title={item.jobDescriptionInfo?.title}>
                        {item.jobDescriptionInfo?.title || "Chưa có vị trí"}
                      </p>
                    </TableCell>

                    {/* Scheduled Start & End */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {formatDateTime(item.scheduledStart)}
                        </span>
                        {item.scheduledEnd && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            đến {formatDateTime(item.scheduledEnd)}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <KioskStatusBadge status={item.status} />
                    </TableCell>

                    {/* Session Key & Notes */}
                    <TableCell className="pr-6">
                      {item.sessionKey ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Key className="h-3 w-3 text-amber-500" />
                          {item.sessionKey}
                        </span>
                      ) : item.notes ? (
                        <span
                          className="truncate text-xs text-slate-500 dark:text-slate-400"
                          title={item.notes}>
                          {item.notes}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
