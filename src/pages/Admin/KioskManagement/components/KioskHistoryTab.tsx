import { KioskStatusBadge, ReloadButton } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Clock, History, Key, Search, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface KioskHistoryTabProps {
  kioskId: number;
}

export function KioskHistoryTab({ kioskId }: KioskHistoryTabProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<KioskHistoryResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadHistory = useCallback(
    async (showReloading = false) => {
      if (showReloading) setIsReloading(true);
      else setLoading(true);
      try {
        const res = await kioskManager.getKioskHistory(kioskId);
        if (res.success && res.data) {
          setHistory(res.data);
        } else {
          toast.error(res.error || t("common.unableToLoadData"));
          setHistory([]);
        }
      } catch (err) {
        console.error("[KioskHistoryTab] Error fetching history:", err);
        toast.error(t("common.unableToLoadData"));
      } finally {
        setLoading(false);
        setIsReloading(false);
      }
    },
    [kioskId, t]
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      const candidateName = item.candidateInfo?.name?.toLowerCase() || "";
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

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatTimeOnly = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "HH:mm");
    } catch {
      return dateStr;
    }
  };

  const statusFilters = [
    { id: "ALL", label: t("common.all") },
    { id: "COMPLETED", label: "Hoàn thành" },
    { id: "IN_PROGRESS", label: "Đang diễn ra" },
    { id: "AWAITING_MENTOR", label: "Chờ mentor" },
    { id: "CANCELLED", label: "Đã hủy" },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-400" />
      </div>
    );
  }

  return (
    <div>
      {/* ── TOOLBAR ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-white px-6 py-3 dark:border-slate-800/60 dark:bg-slate-900">
        <div className="relative w-72">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={t("adminKioskManagement.searchHistoryPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs focus-visible:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {statusFilters.map((f) => (
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
          <ReloadButton onReload={() => void loadHistory(true)} isLoading={isReloading} size="sm" />
        </div>
      </div>

      {/* ── RESULT COUNT ──────────────────────────────────────────────── */}
      {(searchQuery.trim().length > 0 || statusFilter !== "ALL") && (
        <div className="flex items-center gap-2 px-6 py-2">
          <span className="text-xs text-slate-500">
            Hiển thị{" "}
            <strong className="text-slate-800 dark:text-slate-200">{filteredHistory.length}</strong>{" "}
            / <strong>{history.length}</strong> kết quả
          </span>
        </div>
      )}

      {/* ── TABLE / EMPTY STATE ───────────────────────────────────────── */}
      {filteredHistory.length === 0 ? (
        <div className="mx-6 mt-4 flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <History className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {t("adminKioskManagement.noHistory")}
          </p>
        </div>
      ) : (
        <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                <TableHead className="w-[80px] pl-6 font-medium text-slate-500">Mã</TableHead>
                <TableHead className="min-w-[200px] font-medium text-slate-500">Ứng viên</TableHead>
                <TableHead className="min-w-[200px] font-medium text-slate-500">
                  Vị trí ứng tuyển
                </TableHead>
                <TableHead className="w-[120px] font-medium text-slate-500">Cấp độ</TableHead>
                <TableHead className="min-w-[140px] font-medium text-slate-500">
                  Thời gian phỏng vấn
                </TableHead>
                <TableHead className="w-[140px] font-medium text-slate-500">Trạng thái</TableHead>
                <TableHead className="w-[130px] pr-6 font-medium text-slate-500">
                  Session Key
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
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800">
                        <AvatarImage
                          src={item.candidateInfo?.avatarUrl || undefined}
                          alt={item.candidateInfo?.name || "Candidate"}
                        />
                        <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {item.candidateInfo?.name?.charAt(0)?.toUpperCase() || (
                            <User className="h-3.5 w-3.5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {item.candidateInfo?.name || "Ứng viên ẩn danh"}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {item.candidateInfo?.email || "—"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200"
                        title={item.jobDescriptionInfo?.title}>
                        {item.jobDescriptionInfo?.title ||
                          item.candidateInfo?.targetRole ||
                          "Chưa có vị trí"}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {item.jobDescriptionInfo?.companyName || "—"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {item.jobDescriptionInfo?.level || item.candidateInfo?.targetLevel || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {formatDateOnly(item.scheduledStart)}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatTimeOnly(item.scheduledStart)}
                        {item.scheduledEnd && ` - ${formatTimeOnly(item.scheduledEnd)}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <KioskStatusBadge status={item.status} />
                  </TableCell>
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
        </div>
      )}
    </div>
  );
}
