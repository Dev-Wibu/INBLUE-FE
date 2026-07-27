import { PaginationControl } from "@/components/shared";
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
    // Return all items if no pagination data is available yet
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
    <div className="space-y-4">
      {/* Container header nếu cần tiêu đề tab */}
      <div className="flex items-center gap-2 px-1">
        <Receipt className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t("payment.jdPurchaseHistory")}
        </h3>
      </div>

      {loadState === "loading" && (
        <div className="flex h-40 items-center justify-center">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
        </div>
      )}

      {loadState === "error" && (
        <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20">
          <Package className="h-8 w-8 text-rose-400 dark:text-rose-500" />
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {t("payment.jdPurchaseLoadError")}
          </p>
        </div>
      )}

      {loadState === "ready" && purchases.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ShoppingBag className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("payment.jdPurchaseNoPurchases")}
          </p>
        </div>
      )}

      {/* Table Container chuẩn hệ thống */}
      {loadState === "ready" && purchases.length > 0 && (
        <>
          <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                  <TableHead className="w-[100px] pl-6 font-medium text-slate-500">#ID</TableHead>
                  <TableHead className="font-medium text-slate-500">Thông tin JD</TableHead>
                  <TableHead className="font-medium text-slate-500">Giao dịch</TableHead>
                  <TableHead className="font-medium text-slate-500">Trạng thái</TableHead>
                  <TableHead className="font-medium text-slate-500">Thời gian</TableHead>
                  <TableHead className="pr-6 text-right font-medium text-slate-500">
                    Thành tiền
                  </TableHead>
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
                      <div className="flex flex-col gap-1">
                        {purchase.jobDescription?.id ? (
                          <Link
                            to={`/enterprise/job/${purchase.jobDescription.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-800 hover:underline dark:text-indigo-400">
                            {purchase.jobDescription?.title || "Untitled"}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {purchase.jobDescription?.title || "Untitled"}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {purchase.jobDescription?.companyName || t("common.unknown")}
                        </span>
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
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-600 dark:text-slate-300">
                          Mua: {formatPurchaseDate(purchase.purchasedAt)}
                        </span>
                        {purchase.status === "USED" ? (
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            Dùng: {formatPurchaseDate(purchase.usedAt)}
                          </span>
                        ) : purchase.status === "EXPIRED" ? (
                          <span className="font-medium text-rose-600 dark:text-rose-400">
                            Hết hạn: {formatPurchaseDate(purchase.validUntil)}
                          </span>
                        ) : purchase.validUntil ? (
                          <span className="text-slate-500 dark:text-slate-400">
                            HSD: {formatPurchaseDate(purchase.validUntil)}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {purchase.payment?.amount ? formatCurrency(purchase.payment.amount) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Thanh phân trang ngay dưới bảng */}
          <div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
            <PaginationControl pagination={pagination} />
          </div>
        </>
      )}
    </div>
  );
}
