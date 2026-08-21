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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppApiError } from "@/lib/error-normalizer";
import { topDevJobImportManager, type TopDevJobPreview } from "@/services";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDownToLine,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  plainText,
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

export function TopDevJobImportPage() {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [items, setItems] = useState<TopDevJobPreview[]>([]);
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<TopDevJobPreview | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importedCount, setImportedCount] = useState(0);

  const categoriesQuery = useQuery({
    queryKey: ["topdev-job-categories"],
    queryFn: () => topDevJobImportManager.getCategories(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

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
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    clearResults();
  };

  const searchPage = async (targetPage: number) => {
    setIsSearching(true);
    setSearchError("");
    setSelectedIds(new Set());
    try {
      const results = await topDevJobImportManager.search({
        keyword: filters.keyword.trim() || undefined,
        level: filters.level === "ALL" ? undefined : filters.level,
        jobCategoriesIds: filters.categoryId === "ALL" ? undefined : [Number(filters.categoryId)],
        page: targetPage,
        limit: TOPDEV_PAGE_SIZE,
      });
      setItems(results);
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
        const result = await topDevJobImportManager.importJob(toImportPayload(job));
        succeeded += 1;
        setItems((current) =>
          current.map((item) =>
            jobKey(item) === id
              ? { ...item, isExist: true, existingJobDescriptionId: result.jobDescriptionId }
              : item
          )
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

    setImportedCount((current) => current + succeeded);
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

  const renderSkills = (skills?: string) => {
    const values = splitSkills(skills);
    if (values.length === 0) return <span className="text-slate-400">—</span>;
    return (
      <div className="flex max-w-[280px] flex-wrap gap-1">
        {values.slice(0, 3).map((skill) => (
          <Badge key={skill} variant="secondary" className="rounded-md px-1.5 py-0 text-[11px]">
            {skill}
          </Badge>
        ))}
        {values.length > 3 && <span className="text-xs text-slate-500">+{values.length - 3}</span>}
      </div>
    );
  };

  return (
    <div className="-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <form
        onSubmit={handleSearch}
        className="flex flex-none flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 lg:flex-row lg:items-end lg:px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0 flex-1">
          <Label
            htmlFor="topdev-keyword"
            className="mb-1.5 block text-xs text-slate-600 dark:text-slate-300">
            {t("adminTopDevImport.keyword", "Từ khóa")}
          </Label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="topdev-keyword"
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              placeholder={t("adminTopDevImport.keywordPlaceholder", "Ví dụ: Java, React, DevOps")}
              className="h-9 pl-9"
            />
          </div>
        </div>
        <div className="w-full lg:w-44">
          <Label className="mb-1.5 block text-xs text-slate-600 dark:text-slate-300">
            {t("adminTopDevImport.level", "Cấp độ")}
          </Label>
          <Select
            value={filters.level}
            onValueChange={(value) => updateFilter("level", value as Level)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("common.all", "Tất cả")}</SelectItem>
              {(["INTERN", "FRESHER", "JUNIOR", "MIDDLE"] as const).map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full lg:w-64">
          <Label className="mb-1.5 block text-xs text-slate-600 dark:text-slate-300">
            {t("adminTopDevImport.category", "Nhóm nghề")}
          </Label>
          <Select
            value={filters.categoryId}
            onValueChange={(value) => updateFilter("categoryId", value)}
            disabled={categoriesQuery.isLoading}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("common.all", "Tất cả")}</SelectItem>
              {(categoriesQuery.data ?? []).map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {categoriesQuery.isError && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void categoriesQuery.refetch()}
              title={t("common.retry", "Thử lại")}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSearching}
            className="h-9 bg-indigo-600 px-5 hover:bg-indigo-700">
            {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
            {t("adminTopDevImport.search", "Tìm JD")}
          </Button>
        </div>
      </form>

      <div className="flex-1 overflow-auto py-5">
        {searchError && (
          <Alert variant="destructive" className="mx-4 mb-4 max-w-3xl md:mx-6">
            <AlertCircle />
            <AlertTitle>{t("adminTopDevImport.searchFailed", "Không tải được kết quả")}</AlertTitle>
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
          <div className="mx-4 flex h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 text-center md:mx-6 dark:border-slate-700 dark:bg-slate-900/40">
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

        {isSearching && (
          <div className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {[0, 1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="flex h-20 items-center gap-4 border-b border-slate-100 px-6 last:border-0 dark:border-slate-800">
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
          <div className="mx-4 flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 text-center md:mx-6 dark:border-slate-700 dark:bg-slate-900/40">
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

        {items.length > 0 && !isSearching && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6">
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span>
                  {t("adminTopDevImport.pageResults", "{{count}} kết quả ở trang {{page}}", {
                    count: items.length,
                    page,
                  })}
                </span>
                {importedCount > 0 && (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {t(
                      "adminTopDevImport.importedThisSession",
                      "{{count}} JD đã nhập trong phiên này",
                      { count: importedCount }
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllAvailable}
                  disabled={availableIds.length === 0 || importingIds.size > 0}>
                  <Checkbox checked={allAvailableSelected} tabIndex={-1} aria-hidden="true" />
                  {t("adminTopDevImport.selectAvailable", "Chọn tất cả khả dụng")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void importSelected()}
                  disabled={selectedJobs.length === 0 || importingIds.size > 0}
                  className="bg-indigo-600 hover:bg-indigo-700">
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

            <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-950/60 dark:hover:bg-slate-950/60">
                    <TableHead className="w-12 pl-6">
                      <span className="sr-only">{t("adminTopDevImport.select", "Chọn")}</span>
                    </TableHead>
                    <TableHead className="min-w-[340px] text-slate-500">
                      {t("adminTopDevImport.positionCompany", "Vị trí & công ty")}
                    </TableHead>
                    <TableHead className="min-w-[150px] text-slate-500">
                      {t("adminTopDevImport.locationSalary", "Địa điểm & lương")}
                    </TableHead>
                    <TableHead className="min-w-[220px] text-slate-500">
                      {t("adminTopDevImport.skills", "Kỹ năng")}
                    </TableHead>
                    <TableHead className="w-32 text-slate-500">
                      {t("adminTopDevImport.postedAt", "Ngày đăng")}
                    </TableHead>
                    <TableHead className="w-32 pr-6 text-right text-slate-500">
                      {t("common.status", "Trạng thái")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((job) => {
                    const id = jobKey(job);
                    const isImporting = importingIds.has(id);
                    return (
                      <TableRow
                        key={id}
                        className="group cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                        onClick={() => setPreview(job)}>
                        <TableCell className="pl-6" onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(id)}
                            disabled={job.isExist || isImporting || !id}
                            onCheckedChange={() => toggleSelected(id)}
                            aria-label={t("adminTopDevImport.selectJob", "Chọn {{title}}", {
                              title: job.title,
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {job.companyName?.slice(0, 2).toUpperCase() || "TD"}
                              {job.companyLogo && (
                                <img
                                  src={job.companyLogo}
                                  alt=""
                                  className="absolute inset-0 h-full w-full bg-white object-contain"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                className="block max-w-[380px] truncate text-left text-sm font-semibold text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                                {job.title || t("common.unspecified", "Chưa xác định")}
                              </button>
                              <p className="mt-0.5 max-w-[360px] truncate text-xs text-slate-500 dark:text-slate-400">
                                {job.companyName || t("common.unspecified", "Chưa xác định")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {job.location || "—"}
                            </span>
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              {job.salary || t("adminTopDevImport.negotiable", "Thỏa thuận")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{renderSkills(job.skills)}</TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          {formatDate(job.postedAt, i18n.language)}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          {isImporting ? (
                            <Badge variant="secondary">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              {t("adminTopDevImport.importingShort", "Đang nhập")}
                            </Badge>
                          ) : job.isExist ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {t("adminTopDevImport.imported", "Đã import")}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {t("adminTopDevImport.available", "Khả dụng")}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-500">
                {t("adminTopDevImport.page", "Trang {{page}}", { page })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void searchPage(page - 1)}
                  disabled={page === 1 || isSearching || importingIds.size > 0}>
                  <ChevronLeft />
                  {t("common.previous", "Trước")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void searchPage(page + 1)}
                  disabled={
                    items.length < TOPDEV_PAGE_SIZE || isSearching || importingIds.size > 0
                  }>
                  {t("common.next", "Sau")}
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Sheet open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
          {preview && (
            <>
              <SheetHeader className="border-b border-slate-200 pr-12 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-xs font-bold dark:bg-slate-800">
                    {preview.companyName?.slice(0, 2).toUpperCase() || "TD"}
                    {preview.companyLogo && (
                      <img
                        src={preview.companyLogo}
                        alt=""
                        className="absolute inset-0 h-full w-full bg-white object-contain"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-base leading-6">{preview.title}</SheetTitle>
                    <SheetDescription>{preview.companyName}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="space-y-6 p-4">
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {preview.location || "—"}
                  </span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {preview.salary || t("adminTopDevImport.negotiable", "Thỏa thuận")}
                  </span>
                  {preview.requestedLevel && (
                    <Badge variant="outline">{preview.requestedLevel}</Badge>
                  )}
                </div>
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
                      <section key={title}>
                        <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {title}
                        </h3>
                        <p className="text-sm leading-6 whitespace-pre-line text-slate-600 dark:text-slate-300">
                          {plainText(content)}
                        </p>
                      </section>
                    )
                )}
                {preview.sourceUrl && (
                  <Button asChild variant="outline" className="w-full">
                    <a href={preview.sourceUrl} target="_blank" rel="noreferrer">
                      {t("adminTopDevImport.openSource", "Mở JD gốc trên TopDev")}
                      <ExternalLink />
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
