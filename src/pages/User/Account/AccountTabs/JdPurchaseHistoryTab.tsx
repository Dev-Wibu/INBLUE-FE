import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatting";
import type { JdPurchase } from "@/services/jd-purchase.manager";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { jobDescriptionManager } from "@/services/job-description.manager";
import { paymentManager } from "@/services/payment.manager";
import { Package, Receipt, ShoppingBag, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

interface EnrichedJdPurchase extends JdPurchase {
  jdTitle?: string;
  amount?: number;
}

export function JdPurchaseHistoryTab() {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState<EnrichedJdPurchase[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rawPurchases = await jdPurchaseManager.getMyPurchases();
        if (cancelled) return;

        if (rawPurchases.length === 0) {
          setPurchases([]);
          setLoadState("ready");
          return;
        }

        const uniqueJdIds = Array.from(
          new Set(rawPurchases.map((p) => p.jdId).filter((id): id is number => Boolean(id)))
        );
        const uniquePaymentIds = Array.from(
          new Set(rawPurchases.map((p) => p.paymentId).filter((id): id is number => Boolean(id)))
        );

        const jdMap = new Map<number, { title?: string; price?: number }>();
        const paymentMap = new Map<number, number>();

        await Promise.allSettled([
          ...uniqueJdIds.map(async (jdId) => {
            const res = await jobDescriptionManager.getById(jdId);
            if (res.success && res.data) {
              jdMap.set(jdId, { title: res.data.title, price: res.data.price });
            }
          }),
          ...uniquePaymentIds.map(async (payId) => {
            const res = await paymentManager.getById(payId);
            if (res.success && res.data && typeof res.data.amount === "number") {
              paymentMap.set(payId, res.data.amount);
            }
          }),
        ]);

        if (cancelled) return;

        const enriched: EnrichedJdPurchase[] = rawPurchases.map((p) => {
          const jdInfo = jdMap.get(p.jdId);
          const payAmount = paymentMap.get(p.paymentId);
          return {
            ...p,
            jdTitle: jdInfo?.title,
            amount: payAmount ?? jdInfo?.price,
          };
        });

        setPurchases(enriched);
        setLoadState("ready");
      } catch {
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
        <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                <TableHead className="w-[80px] pl-6 font-medium text-slate-500">STT</TableHead>
                <TableHead className="font-medium text-slate-500">Thông tin JD</TableHead>
                <TableHead className="font-medium text-slate-500">Mã giao dịch</TableHead>
                <TableHead className="font-medium text-slate-500">Trạng thái</TableHead>
                <TableHead className="font-medium text-slate-500">Ngày mua</TableHead>
                <TableHead className="font-medium text-slate-500">Ngày sử dụng</TableHead>
                <TableHead className="pr-6 text-right font-medium text-slate-500">Thành tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase, idx) => (
                <TableRow
                  key={purchase.id}
                  className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                  <TableCell className="pl-6 py-4 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                    #{idx + 1}
                  </TableCell>
                  <TableCell className="py-4">
                    <Link
                      to={`/enterprise/job/${purchase.jdId}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-800 dark:text-indigo-400 hover:underline">
                      {purchase.jdTitle || "Untitled"}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                  <TableCell className="py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                    #{purchase.paymentId}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        purchase.status === "PURCHASED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400"
                          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      )}>
                      {t(`payment.jdPurchaseStatus_${purchase.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-sm text-slate-600 dark:text-slate-300">
                    {formatPurchaseDate(purchase.purchasedAt)}
                  </TableCell>
                  <TableCell className="py-4 text-sm text-slate-600 dark:text-slate-300">
                    {purchase.status === "USED" ? formatPurchaseDate(purchase.usedAt) : "—"}
                  </TableCell>
                  <TableCell className="py-4 pr-6 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {purchase.amount ? formatCurrency(purchase.amount) : "—"}
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
