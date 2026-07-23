import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import type { PaymentEntity, PaymentPurpose } from "@/interfaces";
import { formatCurrency, formatDateTime, toTimestamp } from "@/lib/formatting";
import { paymentManager } from "@/services/payment.manager";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type PaymentStatusFilter = "all" | "PENDING" | "COMPLETED" | "FAILED";
type PaymentPurposeFilter = "all" | PaymentPurpose;

type SortablePayment = PaymentEntity & {
  idSortValue: number;
  transactionCodeSortValue: string;
  descriptionSortValue: string;
  amountSortValue: number;
  statusSortValue: string;
  paymentPurposeSortValue: string;
  createdAtSortValue: number;
};

const paymentStatusLabel = (value: string | undefined, t: (key: string) => string) => {
  const normalized = value?.toUpperCase();
  if (normalized === "PENDING") return t("common.processing1");
  if (normalized === "COMPLETED") return t("common.completed");
  if (normalized === "FAILED") return t("general.failed1");
  return "-";
};

const paymentPurposeLabel = (value: PaymentPurpose | undefined, t: (key: string) => string) => {
  switch (value) {
    case "FULLY_PAID":
      return t("common.buyPackages");
    case "MENTOR_INTERVIEW":
      return t("adminTransactionpaymentmanagement.interviewMentor");
    default:
      return "-";
  }
};

export function PaymentManagementPage() {
  const { t } = useTranslation();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentEntity[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>("all");
  const [paymentPurposeFilter, setPaymentPurposeFilter] = useState<PaymentPurposeFilter>("all");
  const [paymentPageSize, setPaymentPageSize] = useHybridPageSize({
    key: "src_pages_admin_paymentmanagement_paymentmanagementpage_tsx_pagesize",
    defaultPageSize: 10,
  });

  const loadData = useCallback(
    async (showReloading = false) => {
      if (showReloading) {
        setIsReloading(true);
      } else {
        setIsInitialLoading(true);
      }
      setError(null);
      const result = await paymentManager.getAll();
      if (!result.success) {
        setError(
          result.error || t("adminTransactionpaymentmanagement.unableToDownloadTransactionAnd")
        );
        setPayments(result.data || []);
      } else {
        setPayments(result.data || []);
      }
      if (showReloading) {
        setIsReloading(false);
      } else {
        setIsInitialLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadData]);

  const paymentCount = payments.length;
  const normalizedSearch = searchKeyword.trim().toLowerCase();

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const textMatch =
        normalizedSearch.length === 0 ||
        (payment.transactionCode || "").toLowerCase().includes(normalizedSearch) ||
        (payment.description || "").toLowerCase().includes(normalizedSearch);
      const statusMatch =
        paymentStatusFilter === "all" || payment.status?.toUpperCase() === paymentStatusFilter;
      const purposeMatch =
        paymentPurposeFilter === "all" || payment.paymentPurpose === paymentPurposeFilter;
      return textMatch && statusMatch && purposeMatch;
    });
  }, [normalizedSearch, paymentPurposeFilter, paymentStatusFilter, payments]);

  const sortablePayments = useMemo<SortablePayment[]>(() => {
    return filteredPayments.map((payment) => ({
      ...payment,
      idSortValue: typeof payment.id === "number" ? payment.id : 0,
      transactionCodeSortValue: (payment.transactionCode || "").toLowerCase(),
      descriptionSortValue: (payment.description || "").toLowerCase(),
      amountSortValue: payment.amount || 0,
      statusSortValue: (payment.status || "").toUpperCase(),
      paymentPurposeSortValue: payment.paymentPurpose || "",
      createdAtSortValue: toTimestamp(payment.createdAt) ?? 0,
    }));
  }, [filteredPayments]);

  const { sortedData: sortedPayments, getSortProps: getPaymentSortProps } = useSortable(
    sortablePayments,
    {
      defaultSort: {
        key: "createdAtSortValue",
        direction: "desc",
      },
      noSortBehavior: "preserve",
      tieBreaker: {
        key: "idSortValue",
        direction: "desc",
      },
    }
  );

  const paymentPagination = usePagination({
    totalCount: sortedPayments.length,
    pageSize: paymentPageSize,
  });

  const paymentPageData = useMemo(
    () => sortedPayments.slice(paymentPagination.startIndex, paymentPagination.endIndex + 1),
    [sortedPayments, paymentPagination.startIndex, paymentPagination.endIndex]
  );

  const visiblePaymentCount = sortedPayments.length;

  const totalPaymentAmount = useMemo(
    () => filteredPayments.reduce((acc, item) => acc + (item.amount || 0), 0),
    [filteredPayments]
  );

  const hasActiveFilters =
    searchKeyword.trim().length > 0 ||
    paymentStatusFilter !== "all" ||
    paymentPurposeFilter !== "all";

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* ── TOOLBAR ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("adminTransactionpaymentmanagement.managePayments")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("adminTransactionpaymentmanagement.monitorAndLookUpPayments")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={t("adminTransactionpaymentmanagement.searchByTransactionCodeOr")}
              value={searchKeyword}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSearchKeyword(event.target.value);
                paymentPagination.goToFirstPage();
              }}
              className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
            />
          </div>

          <Select
            value={paymentStatusFilter}
            onValueChange={(value: string) => {
              setPaymentStatusFilter(value as PaymentStatusFilter);
              paymentPagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-[140px] border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allStatus")}</SelectItem>
              <SelectItem value="PENDING">{t("common.processing1")}</SelectItem>
              <SelectItem value="COMPLETED">{t("common.completed")}</SelectItem>
              <SelectItem value="FAILED">{t("general.failed1")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={paymentPurposeFilter}
            onValueChange={(value: string) => {
              setPaymentPurposeFilter(value as PaymentPurposeFilter);
              paymentPagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-[160px] border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
              <SelectValue placeholder={t("adminTransactionpaymentmanagement.purpose")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("adminTransactionpaymentmanagement.allPurpose")}
              </SelectItem>
              <SelectItem value="FULLY_PAID">
                {t("adminTransactionpaymentmanagement.buyMembershipPackage")}
              </SelectItem>
              <SelectItem value="MENTOR_INTERVIEW">{t("common.payForMentorSessions")}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchKeyword("");
                setPaymentStatusFilter("all");
                setPaymentPurposeFilter("all");
                paymentPagination.goToFirstPage();
              }}
              className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
              {t("common.clearFilter")}
            </Button>
          )}

          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />

          <ReloadButton
            onReload={() => loadData(true)}
            isLoading={isReloading}
            tooltip={t("adminTransactionpaymentmanagement.reloadPaymentData")}
            className="h-8 w-8"
          />
        </div>
      </div>

      {/* ── ERROR MESSAGE ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 font-['Inter'] text-sm text-amber-700 sm:mx-6 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300">
          {error}
        </div>
      )}

      {/* ── TABLE CONTENT ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:px-6 sm:pt-6">
          <Card className="border-slate-200 shadow-none dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription>
                {t("adminTransactionpaymentmanagement.totalPayment")}
              </CardDescription>
              <CardTitle className="flex items-baseline gap-1 text-2xl">
                {visiblePaymentCount}
                <span className="text-sm font-normal text-slate-500">
                  / {paymentCount} {t("adminTransactionpaymentmanagement.record")}
                </span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-200 shadow-none dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription>
                {t("adminTransactionpaymentmanagement.totalPayment1")}
              </CardDescription>
              <CardTitle className="text-2xl text-emerald-600">
                {formatCurrency(totalPaymentAmount)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {isInitialLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock
              size="lg"
              label={t("adminTransactionpaymentmanagement.loadingPaymentData")}
            />
          </div>
        ) : paymentPageData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Search className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {t("adminTransactionpaymentmanagement.thereAreNoPaymentsThat")}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                        <SortButton {...getPaymentSortProps("transactionCodeSortValue")}>
                          {t("common.transactionCode")}
                        </SortButton>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                        <SortButton {...getPaymentSortProps("descriptionSortValue")}>
                          {t("common.describe")}
                        </SortButton>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                        <SortButton {...getPaymentSortProps("amountSortValue")}>
                          {t("common.amount")}
                        </SortButton>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                        <SortButton {...getPaymentSortProps("statusSortValue")}>
                          {t("common.status")}
                        </SortButton>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                        <SortButton {...getPaymentSortProps("paymentPurposeSortValue")}>
                          {t("adminTransactionpaymentmanagement.purpose")}
                        </SortButton>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                        <SortButton {...getPaymentSortProps("createdAtSortValue")}>
                          {t("common.creationDate")}
                        </SortButton>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                    {paymentPageData.map((payment) => (
                      <tr key={`${payment.transactionCode}-${payment.id}`}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                          {payment.transactionCode || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {payment.description || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(payment.amount || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {paymentStatusLabel(payment.status, t)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {paymentPurposeLabel(payment.paymentPurpose || undefined, t)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {formatDateTime(payment.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="mt-4 flex items-center justify-end rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <PaginationControl
                  pagination={paymentPagination}
                  onPageSizeChange={(nextPageSize) => {
                    setPaymentPageSize(nextPageSize);
                    paymentPagination.goToFirstPage();
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
