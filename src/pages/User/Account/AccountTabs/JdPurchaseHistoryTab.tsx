import { PaginationControl } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { formatCurrency } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { JdPurchase } from "@/services/jd-purchase.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { ExternalLink, Package, Receipt, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function formatPurchaseDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

type LoadState = "loading" | "ready" | "error";

export function JdPurchaseHistoryTab() {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState<JdPurchase[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const [pageSize] = useHybridPageSize({ key: "jd-purchase-history", defaultPageSize: 10 });

  // Use 10 as fallback if pageSize is somehow undefined
  const effectivePageSize = pageSize || 10;

  const pagination = usePagination({
    totalCount: purchases.length,
    pageSize: effectivePageSize,
  });

  const paginatedPurchases = useMemo(() => {
    if (purchases.length === 0) return [];
    return purchases.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [purchases, pagination.startIndex, pagination.endIndex]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rawPurchases = await jdPurchaseManager.getMyPurchases();
        if (cancelled) return;
        setPurchases(rawPurchases || []);
        setLoadState("ready");
      } catch (error) {
        console.error("Error fetching purchases:", error);
        if (!cancelled) {
          setLoadState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="animate-in fade-in space-y-5 duration-300">
      {/* Subheader Container matching Notification Tab */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80 dark:bg-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs ring-1 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-400 dark:ring-indigo-500/30">
            <Receipt className="h-5.5 w-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {t("payment.jdPurchaseHistory")}
              </h1>
              {purchases.length > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  {purchases.length} {t("payment.purchasesCount", "giao dịch")}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t(
                "payment.jdPurchaseHistoryDescription",
                "Quản lý và xem lại lịch sử các gói JD đã mua"
              )}
            </p>
          </div>
        </div>
      </div>

      {loadState === "loading" && (
        <div className="flex h-44 items-center justify-center rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
        </div>
      )}

      {loadState === "error" && (
        <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20">
          <Package className="h-8 w-8 text-rose-400 dark:text-rose-500" />
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            {t("payment.jdPurchaseLoadError")}
          </p>
        </div>
      )}

      {loadState === "ready" && purchases.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200/90 bg-white dark:border-slate-800/80 dark:bg-slate-900/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-400">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t("payment.jdPurchaseNoPurchases")}
          </p>
        </div>
      )}

      {/* Rounded Table Container matching Notifications Card */}
      {loadState === "ready" && purchases.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                <TableHead className="w-[100px] pl-6 font-medium text-slate-500">#ID</TableHead>
                <TableHead className="font-medium text-slate-500">Doanh nghiệp</TableHead>
                <TableHead className="font-medium text-slate-500">Thông tin JD</TableHead>
                <TableHead className="font-medium text-slate-500">Giao dịch</TableHead>
                <TableHead className="font-medium text-slate-500">Trạng thái</TableHead>
                <TableHead className="text-right font-medium text-slate-500">Thành tiền</TableHead>
                <TableHead className="pl-4 font-medium text-slate-500">Ngày mua</TableHead>
                <TableHead className="pr-6 font-medium text-slate-500">Hạn / SD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPurchases.map((purchase) => (
                <TableRow
                  key={purchase.id}
                  className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                  <TableCell className="py-4 pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                    #{purchase.id}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 shrink-0 rounded-md border border-slate-200 dark:border-slate-800">
                        <AvatarImage
                          src={
                            purchase.jobDescription?.thumbnailUrl ||
                            purchase.jobDescription?.companyLogoUrl ||
                            purchase.jobDescription?.companyLogo ||
                            ""
                          }
                          alt={purchase.jobDescription?.companyName || "Company"}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-md bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {(purchase.jobDescription?.companyName || "C").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {purchase.jobDescription?.companyName || t("common.unknown")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      {purchase.jobDescription?.id ? (
                        <Link
                          to={`/enterprise/job/${purchase.jobDescription.id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-800 hover:underline dark:text-indigo-400">
                          <span className="line-clamp-2 max-w-[200px]">
                            {purchase.jobDescription?.title || "Untitled"}
                          </span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </Link>
                      ) : (
                        <span className="line-clamp-2 max-w-[200px] text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {purchase.jobDescription?.title || "Untitled"}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {purchase.payment?.id ? `#${purchase.payment.id}` : "N/A"}
                      </span>
                      <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        {purchase.payment?.method || "PayOS"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        purchase.status === "PURCHASED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400"
                          : purchase.status === "EXPIRED"
                            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-400"
                            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      )}>
                      {t(`payment.jdPurchaseStatus_${purchase.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {purchase.payment?.amount ? formatCurrency(purchase.payment.amount) : "—"}
                  </TableCell>
                  <TableCell className="py-4 pl-4">
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {formatPurchaseDate(purchase.purchasedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 pr-6">
                    {purchase.status === "USED" ? (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {formatPurchaseDate(purchase.usedAt)}
                      </span>
                    ) : purchase.status === "EXPIRED" ? (
                      <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        {formatPurchaseDate(purchase.validUntil)}
                      </span>
                    ) : purchase.validUntil ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatPurchaseDate(purchase.validUntil)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Thanh phân trang ngay dưới bảng */}
          <div className="flex items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800/80 dark:bg-slate-900">
            <PaginationControl pagination={pagination} />
          </div>
        </div>
      )}
    </div>
  );
}
