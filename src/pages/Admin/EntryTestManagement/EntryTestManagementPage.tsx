import { PaginationControl, TruncatedScrollText } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpinnerBlock } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import {
  entryTestAdminManager,
  type AdminEntryTest,
  type AdminLevelScale,
} from "@/services/entry-test-admin.manager";
import {
  ClipboardCheck,
  Clock3,
  Edit3,
  Gauge,
  Layers3,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  EntryTestSectionConfig,
  EntryTestSectionType,
  TargetLevel,
  TargetRole,
} from "@/features/entry-test/types/entry-test.types";

const roles: TargetRole[] = ["BE", "FE", "QA_QC", "BA", "DEVOPS", "DATA"];
const levels: TargetLevel[] = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE"];
const sectionLabelKeys: Record<EntryTestSectionType, string> = {
  COMMON_QUIZ: "adminEntryTest.sections.common",
  SPECIFIC_QUIZ: "adminEntryTest.sections.specific",
  SPECIFIC_CODING: "adminEntryTest.sections.coding",
};
const emptySection = (
  sectionType: EntryTestSectionType,
  displayOrder: number
): EntryTestSectionConfig => ({
  sectionType,
  itemType: sectionType === "SPECIFIC_CODING" ? "CODING_PROBLEM" : "QUESTION_BANK",
  itemCount: 1,
  totalScore: 0,
  scorePerItem: 0,
  displayOrder,
});

export function EntryTestManagementPage() {
  const { t } = useTranslation();
  const [tests, setTests] = useState<AdminEntryTest[]>([]);
  const [scales, setScales] = useState<AdminLevelScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tests" | "scales">("tests");
  const [editing, setEditing] = useState<AdminEntryTest | null>(null);
  const [scaleRole, setScaleRole] = useState<TargetRole>("BE");
  const [scaleDraft, setScaleDraft] = useState<AdminLevelScale[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [testData, scaleData] = await Promise.all([
        entryTestAdminManager.listEntryTests(),
        entryTestAdminManager.listLevelScales(),
      ]);
      setTests(testData ?? []);
      setScales(scaleData ?? []);
    } catch {
      toast.error(t("adminEntryTest.messages.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setScaleDraft(
      levels.map(
        (level) =>
          scales.find((item) => item.targetRole === scaleRole && item.level === level) ??
          ({
            targetRole: scaleRole,
            level,
            minScore: undefined,
            maxScore: undefined,
            minCodingScore: undefined,
            isActive: true,
          } as AdminLevelScale)
      )
    );
  }, [scaleRole, scales]);

  const activeTest = useMemo(() => tests.find((test) => test.isActive), [tests]);
  const saveTest = async () => {
    if (!editing?.name?.trim() || !editing.timeLimitMinutes || editing.timeLimitMinutes <= 0) {
      toast.error(t("adminEntryTest.messages.invalidGeneral"));
      return;
    }
    const sections = editing.sectionConfigs ?? [];
    if (
      sections.length === 0 ||
      sections.some((section) => section.itemCount <= 0 || section.scorePerItem <= 0) ||
      Math.abs(
        sections.reduce((sum, section) => sum + section.totalScore, 0) - (editing.totalScore ?? 0)
      ) > 0.01
    ) {
      toast.error(t("adminEntryTest.messages.invalidSections"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        totalScore: editing.totalScore,
        timeLimitMinutes: editing.timeLimitMinutes,
        sectionConfigs: sections,
        isActive: editing.isActive ?? false,
      };
      const saved = editing.id
        ? await entryTestAdminManager.updateEntryTest(editing.id, payload)
        : await entryTestAdminManager.createEntryTest(payload);
      setTests((current) =>
        editing.id
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current]
      );
      setEditing(null);
      toast.success(t("adminEntryTest.messages.saveSuccess"));
    } catch {
      toast.error(t("adminEntryTest.messages.saveError"));
    } finally {
      setSaving(false);
    }
  };
  const deactivate = async (id: number) => {
    setSaving(true);
    try {
      const saved = await entryTestAdminManager.deactivateEntryTest(id);
      setTests((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      toast.success(t("adminEntryTest.messages.deactivateSuccess"));
    } catch {
      toast.error(t("adminEntryTest.messages.deactivateError"));
    } finally {
      setSaving(false);
    }
  };
  const saveScales = async () => {
    if (
      scaleDraft.some((scale) => {
        const min = scale.minScore;
        const max = scale.maxScore;
        const coding = scale.minCodingScore;
        return (
          min == null ||
          max == null ||
          !Number.isFinite(min) ||
          !Number.isFinite(max) ||
          min < 0 ||
          max < 0 ||
          min > max ||
          (coding != null && (!Number.isFinite(coding) || coding < 0 || coding > max))
        );
      })
    ) {
      toast.error(t("adminEntryTest.messages.invalidScale"));
      return;
    }
    setSaving(true);
    try {
      const saved = await entryTestAdminManager.upsertLevelScaleSet(
        scaleRole,
        scaleDraft.map((scale) => ({
          targetRole: scale.targetRole,
          level: scale.level,
          minScore: scale.minScore,
          maxScore: scale.maxScore,
          minCodingScore: scale.minCodingScore,
          isActive: scale.isActive,
        }))
      );
      setScales((current) => [
        ...current.filter((item) => item.targetRole !== scaleRole),
        ...saved,
      ]);
      toast.success(t("adminEntryTest.messages.scaleSaveSuccess"));
    } catch {
      toast.error(t("adminEntryTest.messages.scaleSaveError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <SpinnerBlock size="lg" />
      </div>
    );
  return (
    <div className="-m-4 flex min-h-full flex-col bg-slate-50 md:-m-6 lg:-m-8 dark:bg-slate-950">
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto p-5 duration-300 sm:p-6 md:px-8">
        <section className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("adminEntryTest.title")}
                </h1>
                <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                  {t("adminEntryTest.description")}
                </p>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 items-center md:w-auto">
              {[
                [tests.length, t("adminEntryTest.stats.totalTests")],
                [
                  tests.filter((test) => test.isActive).length,
                  t("adminEntryTest.stats.activeTests"),
                ],
                [scales.filter((scale) => scale.isActive).length, t("adminEntryTest.stats.scales")],
              ].map(([value, label], index) => (
                <div key={String(label)} className="flex items-center justify-center">
                  {index > 0 && (
                    <div className="h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-800" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col items-center px-2 text-center sm:min-w-[94px]">
                    <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-sky-400">
                      {value}
                    </span>
                    <span className="mt-1.5 text-[11px] leading-4 font-medium text-slate-500 sm:text-[13px] dark:text-slate-400">
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {tab === "tests" && (
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("adminEntryTest.searchPlaceholder")}
                  className="h-[46px] rounded-xl border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70"
                />
              </div>
            )}
            {tab === "tests" && (
              <Button
                className="h-[46px] rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700"
                onClick={() =>
                  setEditing({
                    name: "",
                    totalScore: 100,
                    timeLimitMinutes: 60,
                    isActive: false,
                    sectionConfigs: [
                      emptySection("COMMON_QUIZ", 1),
                      emptySection("SPECIFIC_QUIZ", 2),
                      emptySection("SPECIFIC_CODING", 3),
                    ],
                  })
                }>
                <Plus className="h-4 w-4" /> {t("adminEntryTest.create")}
              </Button>
            )}
          </div>

          <div className="mt-4 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-950/80">
            {[
              ["tests", t("adminEntryTest.tabs.tests", { count: tests.length })],
              ["scales", t("adminEntryTest.tabs.scales", { count: scales.length })],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value as "tests" | "scales")}
                className={`rounded-lg px-4 py-2 text-[13.5px] font-semibold transition-all ${
                  tab === value
                    ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </section>

        {tab === "tests" ? (
          <TestList
            tests={tests.filter((test) =>
              (test.name ?? "").toLowerCase().includes(search.trim().toLowerCase())
            )}
            activeId={activeTest?.id}
            onEdit={setEditing}
            onDeactivate={deactivate}
            saving={saving}
          />
        ) : (
          <ScaleEditor
            role={scaleRole}
            scales={scaleDraft}
            onRoleChange={setScaleRole}
            onChange={setScaleDraft}
            onSave={saveScales}
            saving={saving}
          />
        )}
      </div>
      {editing && (
        <EntryTestEditor
          value={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={saveTest}
          saving={saving}
        />
      )}
    </div>
  );
}

function TestList({
  tests,
  activeId,
  onEdit,
  onDeactivate,
  saving,
}: {
  tests: AdminEntryTest[];
  activeId?: number;
  onEdit: (_test: AdminEntryTest) => void;
  onDeactivate: (_id: number) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "admin_entry_test_page_size",
    defaultPageSize: 10,
  });
  const pagination = usePagination({ totalCount: tests.length, pageSize });
  const pageData = tests.slice(pagination.startIndex, pagination.endIndex + 1);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
            <TableHead className="w-[80px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.id")}
            </TableHead>
            <TableHead className="min-w-[280px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminEntryTest.columns.name")}
            </TableHead>
            <TableHead className="w-[150px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminEntryTest.columns.duration")}
            </TableHead>
            <TableHead className="w-[140px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminEntryTest.columns.structure")}
            </TableHead>
            <TableHead className="w-[160px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminEntryTest.columns.totalScore")}
            </TableHead>
            <TableHead className="w-[190px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.status")}
            </TableHead>
            <TableHead className="w-[112px] pr-6 text-right font-semibold text-slate-700 dark:text-slate-200">
              {t("adminEntryTest.columns.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageData.map((test) => (
            <TableRow
              key={test.id}
              onClick={() => onEdit(test)}
              className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
              <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                #{test.id ?? "—"}
              </TableCell>
              <TableCell className="max-w-[420px] px-4 py-4">
                <TruncatedScrollText text={test.name || t("adminEntryTest.unnamed")} />
              </TableCell>
              <TableCell className="px-5 py-4">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Clock3 className="h-4 w-4 text-slate-400" />{" "}
                  {t("adminEntryTest.units.minutes", { value: test.timeLimitMinutes ?? "—" })}
                </span>
              </TableCell>
              <TableCell className="px-5 py-4">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Layers3 className="h-4 w-4 text-slate-400" />{" "}
                  {t("adminEntryTest.units.sections", {
                    value: test.sectionConfigs?.length ?? 0,
                  })}
                </span>
              </TableCell>
              <TableCell className="px-5 py-4">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                  <Gauge className="h-4 w-4 text-indigo-500" />{" "}
                  {t("adminEntryTest.units.points", { value: test.totalScore ?? "—" })}
                </span>
              </TableCell>
              <TableCell className="px-5 py-4">
                {test.isActive ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/25 bg-emerald-50/80 px-3 py-1 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500" />
                    {t("common.active")}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-slate-200 bg-slate-100/80 px-3 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    <span className="mr-2 h-2 w-2 rounded-full bg-slate-400" />
                    {t("common.shutDown")}
                  </Badge>
                )}
                {test.id === activeId && (
                  <span className="mt-1.5 block text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                    {t("adminEntryTest.inUse")}
                  </span>
                )}
              </TableCell>
              <TableCell
                className="py-4 pr-6 text-right"
                onClick={(event) => event.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                  onClick={() => onEdit(test)}
                  title={t("general.edit")}>
                  <Edit3 className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                </Button>
                {test.isActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    disabled={saving}
                    title={t("adminEntryTest.deactivate")}
                    onClick={() => test.id && onDeactivate(test.id)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {tests.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ClipboardCheck className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t("adminEntryTest.empty")}
          </p>
        </div>
      )}
      {tests.length > 0 && (
        <div className="flex items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <PaginationControl
            pagination={pagination}
            showBoundaryButtons={false}
            showPageJump={false}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              pagination.goToFirstPage();
            }}
          />
        </div>
      )}
    </div>
  );
}

function EntryTestEditor({
  value,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  value: AdminEntryTest;
  onChange: (_value: AdminEntryTest) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const sections = value.sectionConfigs ?? [];
  const updateSection = (index: number, patch: Partial<EntryTestSectionConfig>) =>
    onChange({
      ...value,
      sectionConfigs: sections.map((section, i) =>
        i === index
          ? {
              ...section,
              ...patch,
              totalScore:
                Number(patch.itemCount ?? section.itemCount) *
                Number(patch.scorePerItem ?? section.scorePerItem),
            }
          : section
      ),
    });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 dark:border-slate-800">
        <DialogHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            {value.id
              ? t("adminEntryTest.editor.editTitle")
              : t("adminEntryTest.editor.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminEntryTest.editor.description")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("adminEntryTest.columns.name")}
              </span>
              <Input
                className="mt-2 h-11 rounded-xl"
                value={value.name ?? ""}
                placeholder={t("adminEntryTest.editor.namePlaceholder")}
                onChange={(e) => onChange({ ...value, name: e.target.value })}
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("adminEntryTest.editor.durationLabel")}
              </span>
              <Input
                className="mt-2 h-11 rounded-xl"
                type="number"
                min="1"
                value={value.timeLimitMinutes ?? ""}
                onChange={(e) => onChange({ ...value, timeLimitMinutes: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {t("adminEntryTest.editor.structureTitle")}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {t("adminEntryTest.editor.structureDescription")}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {sections.reduce((sum, section) => sum + section.totalScore, 0)} /{" "}
                {t("adminEntryTest.units.points", { value: value.totalScore ?? 0 })}
              </Badge>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[1.5fr_110px_120px_110px] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <span>{t("adminEntryTest.editor.section")}</span>
                  <span>{t("adminEntryTest.editor.itemCount")}</span>
                  <span>{t("adminEntryTest.editor.scorePerItem")}</span>
                  <span>{t("adminEntryTest.columns.totalScore")}</span>
                </div>
                {sections.map((section, index) => (
                  <div
                    key={section.sectionType}
                    className="grid grid-cols-[1.5fr_110px_120px_110px] items-center gap-3 border-t border-slate-200 px-4 py-4 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {t(sectionLabelKeys[section.sectionType])}
                      <span className="mt-1 block text-[11px] font-normal text-slate-500">
                        {t(`adminEntryTest.itemTypes.${section.itemType}`)}
                      </span>
                    </span>
                    <Input
                      className="h-10 rounded-lg"
                      type="number"
                      min="1"
                      value={section.itemCount}
                      onChange={(e) => updateSection(index, { itemCount: Number(e.target.value) })}
                    />
                    <Input
                      className="h-10 rounded-lg"
                      type="number"
                      min="0"
                      step="0.01"
                      value={section.scorePerItem}
                      onChange={(e) =>
                        updateSection(index, { scorePerItem: Number(e.target.value) })
                      }
                    />
                    <span className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                      {section.totalScore.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {t("general.cancel")}
          </Button>
          <Button
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
            onClick={onSave}
            disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? t("common.saving") : t("adminEntryTest.editor.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScaleEditor({
  role,
  scales,
  onRoleChange,
  onChange,
  onSave,
  saving,
}: {
  role: TargetRole;
  scales: AdminLevelScale[];
  onRoleChange: (_role: TargetRole) => void;
  onChange: (_scales: AdminLevelScale[]) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t("adminEntryTest.scale.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{t("adminEntryTest.scale.description")}</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <span className="text-xs font-semibold whitespace-nowrap text-slate-500">
            {t("adminEntryTest.scale.role")}
          </span>
          <Select value={role} onValueChange={(value) => onRoleChange(value as TargetRole)}>
            <SelectTrigger className="h-11 w-56 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`entryTestOnboarding.roleLabels.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-900">
            <TableHead className="pl-6 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminEntryTest.scale.level")}
            </TableHead>
            <TableHead className="font-semibold text-slate-700 dark:text-slate-200">
              {t("adminEntryTest.scale.minScore")}
            </TableHead>
            <TableHead className="font-semibold text-slate-700 dark:text-slate-200">
              {t("adminEntryTest.scale.maxScore")}
            </TableHead>
            <TableHead className="font-semibold text-slate-700 dark:text-slate-200">
              {t("adminEntryTest.scale.minCodingScore")}
            </TableHead>
            <TableHead className="pr-6 text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("adminEntryTest.scale.active")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scales.map((scale, index) => (
            <TableRow
              key={scale.level}
              className="border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-800/60 dark:hover:bg-slate-800/80">
              <TableCell className="py-4 pl-6">
                <Badge
                  variant="outline"
                  className="border-indigo-500/25 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  {scale.level
                    ? t(`entryTestOnboarding.levelLabels.${scale.level}`)
                    : t("entryTestOnboarding.notDefined")}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <Input
                  className="h-10 w-32 rounded-lg"
                  type="text"
                  inputMode="decimal"
                  step="0.01"
                  value={scale.minScore == null ? "" : String(scale.minScore)}
                  onChange={(e) =>
                    onChange(
                      scales.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              minScore:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value.replace(/^0+(?=\d)/, "")),
                            }
                          : item
                      )
                    )
                  }
                />
                {scale.minScore == null && (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {t("adminEntryTest.scale.required", "Bắt buộc")}
                  </p>
                )}
              </TableCell>
              <TableCell className="py-4">
                <Input
                  className="h-10 w-32 rounded-lg"
                  type="text"
                  inputMode="decimal"
                  step="0.01"
                  value={scale.maxScore == null ? "" : String(scale.maxScore)}
                  onChange={(e) =>
                    onChange(
                      scales.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              maxScore:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value.replace(/^0+(?=\d)/, "")),
                            }
                          : item
                      )
                    )
                  }
                />
                {scale.maxScore == null ||
                (scale.minScore != null && scale.maxScore < scale.minScore) ? (
                  <p className="mt-1 text-[11px] text-rose-600">
                    {scale.maxScore == null
                      ? t("adminEntryTest.scale.required", "Bắt buộc")
                      : t(
                          "adminEntryTest.scale.invalidRange",
                          "Phải lớn hơn hoặc bằng điểm tối thiểu"
                        )}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="py-4">
                <Input
                  className="h-10 w-36 rounded-lg"
                  type="text"
                  inputMode="decimal"
                  step="0.01"
                  value={scale.minCodingScore == null ? "" : String(scale.minCodingScore)}
                  onChange={(e) =>
                    onChange(
                      scales.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              minCodingScore:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value.replace(/^0+(?=\d)/, "")),
                            }
                          : item
                      )
                    )
                  }
                />
              </TableCell>
              <TableCell className="py-4 pr-6 text-center">
                <Checkbox
                  checked={scale.isActive ?? false}
                  onCheckedChange={(checked) =>
                    onChange(
                      scales.map((item, i) =>
                        i === index ? { ...item, isActive: checked === true } : item
                      )
                    )
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <Button
          className="h-11 rounded-xl bg-indigo-600 px-5 hover:bg-indigo-700"
          onClick={onSave}
          disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? t("common.saving") : t("adminEntryTest.scale.save")}
        </Button>
      </div>
    </div>
  );
}
