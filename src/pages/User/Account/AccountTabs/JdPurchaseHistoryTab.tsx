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
import { Package, Receipt, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
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
      <div className="flex items-center gap-2">
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

      {loadState === "ready" && purchases.length > 0 && (
        <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Table>
            <TableHeader className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
              <TableRow>
                <TableHead className="pl-6 font-medium text-slate-500">#</TableHead>
                <TableHead className="font-medium text-slate-500">
                  {t("payment.jdPurchaseJdId")}
                </TableHead>
                <TableHead className="font-medium text-slate-500">
                  {t("payment.jdPurchasePaymentId")}
                </TableHead>
                <TableHead className="font-medium text-slate-500">
                  {t("common.status", "Trạng thái")}
                </TableHead>
                <TableHead className="font-medium text-slate-500">
                  {t("payment.jdPurchaseDate")}
                </TableHead>
                <TableHead className="font-medium text-slate-500">
                  {t("payment.jdPurchaseUsedDate")}
                </TableHead>
                <TableHead className="pr-6 font-medium text-slate-500">
                  {t("payment.jdPurchaseAmount")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase, idx) => (
                <TableRow
                  key={purchase.id}
                  className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                  <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/enterprise/job/${purchase.jdId}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:bg-slate-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                      <span className="font-mono text-slate-500">#{purchase.jdId}</span>
                      {purchase.jdTitle && (
                        <span className="font-semibold">{purchase.jdTitle}</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    #{purchase.paymentId}
                  </TableCell>
                  <TableCell>
                    {purchase.status === "PURCHASED" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100/80 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {t("payment.jdPurchaseStatus_PURCHASED")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        {t("payment.jdPurchaseStatus_USED")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                    {formatPurchaseDate(purchase.purchasedAt)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                    {purchase.status === "USED" ? formatPurchaseDate(purchase.usedAt) : "—"}
                  </TableCell>
                  <TableCell className="pr-6 text-xs font-medium text-slate-900 dark:text-slate-100">
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
