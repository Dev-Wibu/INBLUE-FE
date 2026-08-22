import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppApiError } from "@/lib/error-normalizer";
import { jobDescriptionManager, topDevJobImportManager, type TopDevJobPreview } from "@/services";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDownToLine,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Layers3,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  plainText,
  resolveDisplayedLevel,
  splitSkills,
  toImportPayload,
  TOPDEV_PAGE_SIZE,
} from "./topdev-job-import.utils";

type Level = "ALL" | "INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE";

interface Filters {
  keyword: string;
  level: Level;
  categoryId: string;
}

const INITIAL_FILTERS: Filters = { keyword: "", level: "ALL", categoryId: "ALL" };

const jobKey = (job: TopDevJobPreview) => job.sourceJobId ?? job.sourceUrl ?? job.title ?? "";

function formatDate(date?: string, locale = "vi-VN") {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat(locale).format(parsed);
}

function isNegotiableSalary(value?: string) {
  return /^(negotiable|not provided|not specified|n\/a|na)$/i.test(value?.trim() ?? "");
}

export function TopDevJobImportPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [items, setItems] = useState<TopDevJobPreview[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(TOPDEV_PAGE_SIZE);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<TopDevJobPreview | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const displaySalary = (salary?: string) =>
    !salary?.trim() || isNegotiableSalary(salary) ? t("adminTopDevImport.negotiable") : salary;
  const displayLevel = (level?: string) => level?.trim() || t("adminTopDevImport.unspecifiedLevel");

  const categoriesQuery = useQuery({
    queryKey: ["topdev-job-categories"],
    queryFn: () => topDevJobImportManager.getCategories(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const existingJdQuery = useQuery({
    queryKey: ["admin", "job-import", "existing-jd", preview?.existingJobDescriptionId],
    queryFn: async () => {
      if (!preview?.existingJobDescriptionId) return null;
      const response = await jobDescriptionManager.getById(preview.existingJobDescriptionId);
      return response.success && response.data ? response.data : null;
    },
    enabled: Boolean(preview?.isExist && preview.existingJobDescriptionId),
    staleTime: 30_000,
  });

  const previewLevelValue =
    preview?.isExist && existingJdQuery.isLoading
      ? t("common.loading", "Đang tải...")
      : displayLevel(
          preview ? resolveDisplayedLevel(preview, existingJdQuery.data?.level) : undefined
        );

  const availableItems = useMemo(() => items.filter((item) => !item.isExist), [items]);
  const availableIds = useMemo(() => availableItems.map(jobKey).filter(Boolean), [availableItems]);
  const selectedJobs = useMemo(
    () => items.filter((item) => selectedIds.has(jobKey(item)) && !item.isExist),
    [items, selectedIds]
  );
  const allAvailableSelected =
    availableIds.length > 0 && availableIds.every((id) => selectedIds.has(id));

  const clearResults = () => {
    setItems([]);
    setPage(1);
    setHasSearched(false);
    setSearchError("");
    setSelectedIds(new Set());
    setPreview(null);
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    clearResults();
  };

  const searchPage = async (targetPage: number, requestedLimit = limit) => {
    setIsSearching(true);
    setSearchError("");
    setSelectedIds(new Set());
    try {
      const results = await topDevJobImportManager.search({
        keyword: filters.keyword.trim() || undefined,
        level: filters.level === "ALL" ? undefined : filters.level,
        jobCategoriesIds: filters.categoryId === "ALL" ? undefined : [Number(filters.categoryId)],
        page: targetPage,
        limit: requestedLimit,
      });
      const requestedLevel = filters.level === "ALL" ? undefined : filters.level;
      const mappedResults = results.map((result) => ({
        ...result,
        requestedLevel: result.requestedLevel ?? requestedLevel,
      }));
      setItems(mappedResults);
      setPreview(mappedResults[0] ?? null);
      setPage(targetPage);
      setHasSearched(true);
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : t("adminTopDevImport.searchError", "Không thể tìm JD từ TopDev. Vui lòng thử lại.")
      );
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLimitChange = (value: string) => {
    const nextLimit = Number(value);
    if (![5, 10].includes(nextLimit)) return;
    setLimit(nextLimit);
    if (hasSearched) {
      void searchPage(1, nextLimit);
    } else {
      clearResults();
    }
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    void searchPage(1);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllAvailable = () => {
    setSelectedIds(allAvailableSelected ? new Set() : new Set(availableIds));
  };

  const importSelected = async () => {
    if (selectedJobs.length === 0 || importingIds.size > 0) return;

    const pendingIds = new Set(selectedJobs.map(jobKey));
    setImportingIds(pendingIds);
    let succeeded = 0;
    let failed = 0;

    for (const job of selectedJobs) {
      const id = jobKey(job);
      try {
        const result = await topDevJobImportManager.importJob(
          toImportPayload(job, filters.level === "ALL" ? undefined : filters.level)
        );
        succeeded += 1;
        setItems((current) =>
          current.map((item) =>
            jobKey(item) === id
              ? { ...item, isExist: true, existingJobDescriptionId: result.jobDescriptionId }
              : item
          )
        );
        setPreview((current) =>
          current && jobKey(current) === id
            ? { ...current, isExist: true, existingJobDescriptionId: result.jobDescriptionId }
            : current
        );
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      } catch (error) {
        failed += 1;
        const apiError = error as AppApiError;
        if (apiError.status === 409) {
          setItems((current) =>
            current.map((item) => (jobKey(item) === id ? { ...item, isExist: true } : item))
          );
          setSelectedIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        }
      } finally {
        setImportingIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    }

    if (succeeded > 0) {
      void queryClient.invalidateQueries({ queryKey: ["admin", "all-jds"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
    }
    if (failed === 0) {
      toast.success(
        t("adminTopDevImport.importSuccess", "Đã import thành công {{count}} JD.", {
          count: succeeded,
        })
      );
    } else {
      toast.warning(
        t(
          "adminTopDevImport.importPartial",
          "Hoàn tất {{success}} JD, {{failed}} JD chưa import được.",
          { success: succeeded, failed }
        )
      );
    }
  };

  return (
    <div className="-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
        <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("adminTopDevImport.pageTitle")}
              </h2>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                {t(
                  "adminTopDevImport.pageDescription",
                  "Tìm, xem trước và nhập nhanh vị trí tuyển dụng vào hệ thống."
                )}
              </p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Label htmlFor="topdev-keyword" className="sr-only">
                  {t("adminTopDevImport.keyword", "Từ khóa")}
                </Label>
                <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <Input
                  id="topdev-keyword"
                  value={filters.keyword}
                  onChange={(event) => updateFilter("keyword", event.target.value)}
                  placeholder={t(
                    "adminTopDevImport.keywordPlaceholder",
                    "Ví dụ: Java, React, DevOps"
                  )}
                  className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:placeholder:text-slate-500"
                />
              </div>
              <Button
                type="submit"
                disabled={isSearching}
                className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                {t("adminTopDevImport.search", "Tìm JD")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-[46px] w-[46px] shrink-0 rounded-xl border-slate-200/90 shadow-2xs dark:border-slate-800"
                onClick={() => void searchPage(1)}
                disabled={isSearching}
                title={t("common.refresh", "Làm mới")}>
                <RefreshCw className={isSearching ? "animate-spin" : ""} />
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                {t("adminTopDevImport.level", "Cấp độ")}:
              </span>
              <Select
                value={filters.level}
                onValueChange={(value) => updateFilter("level", value as Level)}>
                <SelectTrigger className="h-9 w-44 rounded-xl border-slate-200 bg-white text-[13.5px] shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t("adminTopDevImport.allLevels", "Tất cả cấp độ")}
                  </SelectItem>
                  {(["INTERN", "FRESHER", "JUNIOR", "MIDDLE"] as const).map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-800" />
              <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                {t("adminTopDevImport.category", "Nhóm nghề")}:
              </span>
              <Select
                value={filters.categoryId}
                onValueChange={(value) => updateFilter("categoryId", value)}
                disabled={categoriesQuery.isLoading}>
                <SelectTrigger className="h-9 w-60 rounded-xl border-slate-200 bg-white text-[13.5px] shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t("adminTopDevImport.allCategories", "Tất cả nhóm nghề")}
                  </SelectItem>
                  {(categoriesQuery.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoriesQuery.isError && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => void categoriesQuery.refetch()}>
                  <RefreshCw /> {t("common.retry", "Thử lại")}
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="flex-1">
          {searchError && (
            <Alert variant="destructive" className="mx-4 mb-4 max-w-3xl md:mx-6">
              <AlertCircle />
              <AlertTitle>
                {t("adminTopDevImport.searchFailed", "Không tải được kết quả")}
              </AlertTitle>
              <AlertDescription>
                {searchError}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void searchPage(page)}
                  className="mt-2">
                  <RefreshCw /> {t("common.retry", "Thử lại")}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!hasSearched && !isSearching && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("adminTopDevImport.initialTitle", "Tìm JD phù hợp để nhập nhanh")}
              </h2>
              <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                {t(
                  "adminTopDevImport.initialDescription",
                  "Dùng bộ lọc phía trên để lấy dữ liệu mới nhất từ TopDev và xem trước trước khi import."
                )}
              </p>
            </div>
          )}

          {isSearching && items.length === 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {Array.from({ length: limit }, (_, row) => (
                <div
                  key={row}
                  className="flex h-[74px] items-center gap-4 border-b border-slate-100 px-6 last:border-0 dark:border-slate-800">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-10 w-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="hidden h-4 w-28 md:block" />
                  <Skeleton className="hidden h-6 w-44 lg:block" />
                </div>
              ))}
            </div>
          )}

          {hasSearched && !isSearching && items.length === 0 && !searchError && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
              <Search className="h-7 w-7 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("adminTopDevImport.emptyTitle", "Không tìm thấy JD phù hợp")}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t(
                  "adminTopDevImport.emptyDescription",
                  "Hãy thử từ khóa rộng hơn hoặc bỏ bớt bộ lọc."
                )}
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAllAvailable}
                    disabled={availableIds.length === 0 || importingIds.size > 0}
                    className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                    <Checkbox checked={allAvailableSelected} tabIndex={-1} aria-hidden="true" />
                    {t("adminTopDevImport.selectAvailable", "Chọn tất cả khả dụng")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void importSelected()}
                    disabled={selectedJobs.length === 0 || importingIds.size > 0}
                    className="h-9 rounded-xl border border-indigo-600 bg-indigo-600 shadow-xs hover:bg-indigo-700">
                    {importingIds.size > 0 ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <ArrowDownToLine />
                    )}
                    {importingIds.size > 0
                      ? t("adminTopDevImport.importing", "Đang import {{remaining}}...", {
                          remaining: importingIds.size,
                        })
                      : t("adminTopDevImport.importSelected", "Import đã chọn ({{count}})", {
                          count: selectedJobs.length,
                        })}
                  </Button>
                </div>
              </div>

              <div className="grid gap-0 bg-slate-50/70 lg:h-[calc(100vh-390px)] lg:min-h-[560px] lg:grid-cols-[minmax(360px,0.88fr)_minmax(520px,1.45fr)] dark:bg-slate-950/60">
                <div className="min-h-0 space-y-3 border-r border-slate-200/80 p-3 sm:p-4 lg:overflow-y-auto lg:pr-3 dark:border-slate-800">
                  <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{t("adminTopDevImport.jobList", "Danh sách việc làm")}</span>
                    <span>
                      {items.length} / {limit}
                    </span>
                  </div>
                  {items.map((job) => {
                    const id = jobKey(job);
                    const isImporting = importingIds.has(id);
                    const benefits = plainText(job.benefits)
                      .split(/\n+/)
                      .map((line) => line.replace(/^[-*•\d+. ]+/, "").trim())
                      .filter(Boolean)
                      .slice(0, 3);
                    return (
                      <article
                        key={id}
                        className={`group cursor-pointer rounded-2xl border-2 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
                          preview && jobKey(preview) === id
                            ? "border-indigo-500 ring-2 ring-indigo-500/15"
                            : job.isExist
                              ? "border-emerald-200 dark:border-emerald-900"
                              : "border-slate-200 dark:border-slate-800"
                        }`}
                        onClick={() => setPreview(job)}>
                        <div className="flex gap-3">
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                            {job.companyName?.slice(0, 2).toUpperCase() || "TD"}
                            {job.companyLogo && (
                              <img
                                src={job.companyLogo}
                                alt=""
                                className="absolute inset-0 h-full w-full bg-white object-contain p-1"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="line-clamp-2 text-base leading-5 font-bold text-[#3158b8] group-hover:text-indigo-700 dark:text-blue-300">
                                {job.title || t("common.unspecified", "Chưa xác định")}
                              </h3>
                              <div onClick={(event) => event.stopPropagation()}>
                                <Checkbox
                                  checked={selectedIds.has(id)}
                                  disabled={job.isExist || isImporting || !id}
                                  onCheckedChange={() => toggleSelected(id)}
                                  aria-label={t("adminTopDevImport.selectJob", "Chọn {{title}}", {
                                    title: job.title,
                                  })}
                                />
                              </div>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                              {job.companyName || t("common.unspecified", "Chưa xác định")}
                            </p>
                            <p className="mt-2 font-semibold text-[#d31375]">
                              <CircleDollarSign className="mr-1 inline h-4 w-4" />
                              {displaySalary(job.salary)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
                          <span className="flex min-w-0 items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {job.location || t("adminTopDevImport.notProvided")}
                            </span>
                          </span>
                          <span className="flex min-w-0 items-center gap-1">
                            <Layers3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{displayLevel(job.requestedLevel)}</span>
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {splitSkills(job.skills)
                            .slice(0, 3)
                            .map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className="rounded-full border-indigo-200 px-2 py-0.5 text-[11px] text-indigo-700 dark:border-indigo-800 dark:text-indigo-300">
                                {skill}
                              </Badge>
                            ))}
                          {splitSkills(job.skills).length > 3 && (
                            <Badge
                              variant="outline"
                              className="rounded-full px-2 py-0.5 text-[11px]">
                              +{splitSkills(job.skills).length - 3}
                            </Badge>
                          )}
                        </div>
                        {benefits.length > 0 && (
                          <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs leading-4 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                            {benefits.map((benefit) => (
                              <li key={benefit} className="line-clamp-1 list-inside list-disc">
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
                          <span>{formatDate(job.postedAt, i18n.language)}</span>
                          {isImporting ? (
                            <Badge variant="secondary">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              {t("adminTopDevImport.importingShort", "Đang nhập")}
                            </Badge>
                          ) : job.isExist ? (
                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {t("adminTopDevImport.imported", "Đã import")}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {t("adminTopDevImport.available", "Khả dụng")}
                            </Badge>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="hidden min-h-0 bg-white p-3 lg:block dark:bg-slate-900">
                  {preview ? (
                    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex-none border-b border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="text-lg font-bold text-[#3158b8] dark:text-blue-300">
                          {preview.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">{preview.companyName}</p>
                        <p className="mt-1 font-semibold text-[#d31375]">
                          <CircleDollarSign className="mr-1 inline h-4 w-4" />
                          {displaySalary(preview.salary)}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                          <MapPin className="mr-1 inline h-4 w-4" />
                          {preview.location || t("adminTopDevImport.notProvided")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {splitSkills(preview.skills).map((skill) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="rounded-full border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pt-3">
                        {[
                          [
                            t("adminTopDevImport.description", "Mô tả công việc"),
                            preview.description,
                          ],
                          [t("adminTopDevImport.requirements", "Yêu cầu"), preview.requirements],
                          [t("adminTopDevImport.benefits", "Quyền lợi"), preview.benefits],
                        ].map(([title, content]) =>
                          content ? (
                            <section key={title}>
                              <h4 className="mb-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-[#3158b8] dark:bg-slate-800 dark:text-blue-300">
                                {title}
                              </h4>
                              <p className="text-sm leading-6 whitespace-pre-line text-slate-600 dark:text-slate-300">
                                {plainText(content)}
                              </p>
                            </section>
                          ) : null
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                      <BriefcaseBusiness className="h-9 w-9" />
                      <p className="mt-3 text-sm">
                        {t("adminTopDevImport.selectJobHint", "Chọn một JD để xem chi tiết")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("adminTopDevImport.pageResults", "{{count}} kết quả · Trang {{page}}", {
                    count: items.length,
                    page,
                  })}
                </p>
                <div className="flex items-center gap-1">
                  <Select value={String(limit)} onValueChange={handleLimitChange}>
                    <SelectTrigger className="h-7 w-[104px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10].map((size) => (
                        <SelectItem key={size} value={String(size)} className="text-xs">
                          {size} / {t("adminTopDevImport.pageSize", "dòng")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => void searchPage(page - 1)}
                    disabled={page === 1 || isSearching || importingIds.size > 0}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="min-w-8 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                    {page}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => void searchPage(page + 1)}
                    disabled={items.length < limit || isSearching || importingIds.size > 0}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={Boolean(preview) && !isDesktop}
        onOpenChange={(open) => !open && setPreview(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto border-l-slate-200 bg-[#f8f9fc] p-0 sm:max-w-3xl sm:rounded-l-[28px] lg:max-w-[62vw] dark:border-l-slate-800 dark:bg-slate-950">
          {preview && (
            <>
              <SheetHeader className="border-b border-slate-200 bg-white px-5 py-5 pr-14 sm:px-8 sm:py-7 dark:border-slate-800 dark:bg-slate-900">
                <div className="rounded-xl border border-[#5276e8] bg-white p-4 shadow-xs sm:p-5 dark:bg-slate-900">
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {preview.companyName?.slice(0, 2).toUpperCase() || "TD"}
                      {preview.companyLogo && (
                        <img
                          src={preview.companyLogo}
                          alt=""
                          className="absolute inset-0 h-full w-full bg-white object-contain p-1.5"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <SheetTitle className="text-lg leading-6 font-bold text-[#3158b8] sm:text-xl dark:text-blue-300">
                        {preview.title}
                      </SheetTitle>
                      <SheetDescription className="mt-1 text-sm font-medium text-slate-500">
                        {preview.companyName}
                      </SheetDescription>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="font-semibold text-[#d31375]">
                          <CircleDollarSign className="mr-1 inline h-4 w-4" />
                          {displaySalary(preview.salary)}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          <MapPin className="mr-1 inline h-4 w-4" />
                          {preview.location || t("adminTopDevImport.notProvided")}
                        </span>
                        <Badge
                          variant="outline"
                          className="rounded-full border-slate-300 px-2.5 py-0.5 text-xs">
                          {previewLevelValue}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex flex-wrap gap-1.5">
                      {splitSkills(preview.skills)
                        .slice(0, 4)
                        .map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="rounded-full border-[#5276e8] px-2.5 py-0.5 text-xs text-[#3158b8] dark:text-blue-300">
                            {skill}
                          </Badge>
                        ))}
                      {splitSkills(preview.skills).length > 4 && (
                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs">
                          +{splitSkills(preview.skills).length - 4}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {preview.isExist && (
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          {t("adminTopDevImport.imported", "Đã import")}
                        </Badge>
                      )}
                      {preview.sourceUrl && (
                        <Button
                          asChild
                          size="sm"
                          className="h-9 rounded-md bg-[#5276e8] px-5 hover:bg-[#3f63d0]">
                          <a href={preview.sourceUrl} target="_blank" rel="noreferrer">
                            {t("adminTopDevImport.openSource", "Mở JD nguồn")}
                            <ExternalLink />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>
              <div className="space-y-5 p-5 sm:p-8">
                {[
                  [t("adminTopDevImport.description", "Mô tả công việc"), preview.description],
                  [t("adminTopDevImport.requirements", "Yêu cầu"), preview.requirements],
                  [t("adminTopDevImport.benefits", "Quyền lợi"), preview.benefits],
                  [
                    t("adminTopDevImport.companyDescription", "Về công ty"),
                    preview.companyDescription,
                  ],
                ].map(
                  ([title, content]) =>
                    content && (
                      <section
                        key={title}
                        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-base font-semibold text-[#3158b8] dark:border-slate-800 dark:bg-slate-800/70 dark:text-blue-300">
                          {title}
                        </h3>
                        <p className="px-4 py-4 text-sm leading-7 whitespace-pre-line text-slate-600 dark:text-slate-300">
                          {plainText(content)}
                        </p>
                      </section>
                    )
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
