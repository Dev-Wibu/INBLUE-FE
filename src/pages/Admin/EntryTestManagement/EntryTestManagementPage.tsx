import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
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
import {
  entryTestAdminManager,
  type AdminEntryTest,
  type AdminLevelScale,
} from "@/services/entry-test-admin.manager";
import { CheckCircle2, ClipboardCheck, Plus, Save, Trash2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  EntryTestSectionConfig,
  EntryTestSectionType,
  TargetLevel,
  TargetRole,
} from "@/features/entry-test/types/entry-test.types";

const roles: Array<{ value: TargetRole; label: string }> = [
  { value: "BE", label: "Backend" },
  { value: "FE", label: "Frontend" },
  { value: "QA_QC", label: "QA / QC" },
  { value: "BA", label: "Business Analyst" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "DATA", label: "Data" },
];
const levels: TargetLevel[] = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE"];
const sectionLabels: Record<EntryTestSectionType, string> = {
  COMMON_QUIZ: "Kiến thức chung",
  SPECIFIC_QUIZ: "Kiến thức chuyên môn",
  SPECIFIC_CODING: "Lập trình",
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
  const [tests, setTests] = useState<AdminEntryTest[]>([]);
  const [scales, setScales] = useState<AdminLevelScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tests" | "scales">("tests");
  const [editing, setEditing] = useState<AdminEntryTest | null>(null);
  const [scaleRole, setScaleRole] = useState<TargetRole>("BE");
  const [scaleDraft, setScaleDraft] = useState<AdminLevelScale[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [testData, scaleData] = await Promise.all([
        entryTestAdminManager.listEntryTests(),
        entryTestAdminManager.listLevelScales(),
      ]);
      setTests(testData ?? []);
      setScales(scaleData ?? []);
    } catch {
      toast.error("Không thể tải cấu hình Entry Test từ backend.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    setScaleDraft(
      levels.map(
        (level) =>
          scales.find((item) => item.targetRole === scaleRole && item.level === level) ??
          ({
            targetRole: scaleRole,
            level,
            minScore: 0,
            maxScore: 0,
            minCodingScore: null,
            isActive: true,
          } as AdminLevelScale)
      )
    );
  }, [scaleRole, scales]);

  const activeTest = useMemo(() => tests.find((test) => test.isActive), [tests]);
  const saveTest = async () => {
    if (!editing?.name?.trim() || !editing.timeLimitMinutes || editing.timeLimitMinutes <= 0) {
      toast.error("Tên bài và thời lượng phải hợp lệ.");
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
      toast.error("Section phải có số lượng/điểm hợp lệ và tổng điểm phải khớp.");
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
      toast.success("Đã lưu cấu hình Entry Test.");
    } catch {
      toast.error("Backend không thể lưu cấu hình Entry Test.");
    } finally {
      setSaving(false);
    }
  };
  const deactivate = async (id: number) => {
    setSaving(true);
    try {
      const saved = await entryTestAdminManager.deactivateEntryTest(id);
      setTests((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      toast.success("Đã deactivate Entry Test.");
    } catch {
      toast.error("Không thể deactivate Entry Test.");
    } finally {
      setSaving(false);
    }
  };
  const saveScales = async () => {
    if (scaleDraft.some((scale) => (scale.minScore ?? 0) > (scale.maxScore ?? 0))) {
      toast.error("minScore không được lớn hơn maxScore.");
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
      toast.success("Đã lưu thang quy đổi.");
    } catch {
      toast.error("Không thể lưu thang quy đổi.");
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">Entry Test</h1>
          <p className="mt-0.5 text-xs text-slate-500">Cấu hình đề thi và thang quy đổi năng lực</p>
        </div>
        {tab === "tests" && (
          <Button
            className="h-8 bg-indigo-600 px-3 text-xs"
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
            <Plus className="h-3.5 w-3.5" /> Tạo cấu hình
          </Button>
        )}
      </div>
      <div className="border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-5">
          <button
            className={`border-b-2 py-3 text-sm font-semibold ${tab === "tests" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}
            onClick={() => setTab("tests")}>
            Đề thi ({tests.length})
          </button>
          <button
            className={`border-b-2 py-3 text-sm font-semibold ${tab === "scales" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}
            onClick={() => setTab("scales")}>
            Thang quy đổi ({scales.length})
          </button>
        </div>
      </div>
      {tab === "tests" ? (
        <TestList
          tests={tests}
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
  onEdit: (test: AdminEntryTest) => void;
  onDeactivate: (id: number) => void;
  saving: boolean;
}) {
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "admin_entry_test_page_size",
    defaultPageSize: 10,
  });
  const pagination = usePagination({ totalCount: tests.length, pageSize });
  const pageData = tests.slice(pagination.startIndex, pagination.endIndex + 1);
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="py-3 pl-6">Tên đề</th>
              <th className="py-3">Thời lượng</th>
              <th className="py-3">Tổng điểm</th>
              <th className="py-3">Trạng thái</th>
              <th className="py-3 pr-6 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((test) => (
              <tr key={test.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="max-w-[360px] py-4 pl-6 font-semibold">
                  <span className="block truncate" title={test.name || "Chưa đặt tên"}>
                    {test.name || "Chưa đặt tên"}
                  </span>
                </td>
                <td className="py-4 text-slate-600 dark:text-slate-300">
                  {test.timeLimitMinutes ?? "-"} phút
                </td>
                <td className="py-4 text-slate-600 dark:text-slate-300">
                  {test.totalScore ?? "-"}
                </td>
                <td className="py-4">
                  {test.isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <XCircle className="h-3.5 w-3.5" /> Inactive
                    </span>
                  )}
                  {test.id === activeId && (
                    <span className="ml-2 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-600">
                      Đang được dùng
                    </span>
                  )}
                </td>
                <td className="py-4 pr-6 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(test)}>
                    Sửa
                  </Button>
                  {test.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => test.id && onDeactivate(test.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tests.length === 0 && (
          <div className="p-12 text-center text-sm text-slate-500">
            <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            Chưa có cấu hình Entry Test từ backend.
          </div>
        )}
      </div>
      {tests.length > 0 && (
        <div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
          <PaginationControl
            pagination={pagination}
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
  onChange: (value: AdminEntryTest) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {value.id ? "Chỉnh sửa Entry Test" : "Tạo Entry Test"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tổng điểm thực tế dùng scorePerItem × itemCount.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="sm:col-span-2">
            <span className="text-xs font-semibold text-slate-500">Tên đề</span>
            <Input
              className="mt-1"
              value={value.name ?? ""}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-500">Thời lượng (phút)</span>
            <Input
              className="mt-1"
              type="number"
              min="1"
              value={value.timeLimitMinutes ?? ""}
              onChange={(e) => onChange({ ...value, timeLimitMinutes: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="mt-6 overflow-hidden border-y border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-[1.4fr_100px_100px_100px] gap-3 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-950">
            <span>Section</span>
            <span>Số câu</span>
            <span>Điểm/câu</span>
            <span>Thành tiền</span>
          </div>
          {sections.map((section, index) => (
            <div
              key={section.sectionType}
              className="grid grid-cols-[1.4fr_100px_100px_100px] items-center gap-3 border-t border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
              <span className="font-semibold">
                {sectionLabels[section.sectionType]}
                <span className="mt-1 block text-[11px] font-normal text-slate-500">
                  {section.itemType}
                </span>
              </span>
              <Input
                type="number"
                min="1"
                value={section.itemCount}
                onChange={(e) => updateSection(index, { itemCount: Number(e.target.value) })}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={section.scorePerItem}
                onChange={(e) => updateSection(index, { scorePerItem: Number(e.target.value) })}
              />
              <span className="font-mono text-xs">{section.totalScore.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </div>
      </div>
    </div>
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
  onRoleChange: (role: TargetRole) => void;
  onChange: (scales: AdminLevelScale[]) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Thang quy đổi level</h2>
          <p className="mt-1 text-xs text-slate-500">Mỗi role có một bộ khoảng điểm active.</p>
        </div>
        <div className="w-48">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Role</span>
          <Select value={role} onValueChange={(value) => onRoleChange(value as TargetRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="py-3 pl-6">Level</th>
              <th className="py-3">Min score</th>
              <th className="py-3">Max score</th>
              <th className="py-3">Min coding score</th>
              <th className="py-3 pr-6">Active</th>
            </tr>
          </thead>
          <tbody>
            {scales.map((scale, index) => (
              <tr key={scale.level} className="border-t border-slate-200 dark:border-slate-800">
                <td className="py-3 pl-6 font-semibold">{scale.level}</td>
                <td className="py-3">
                  <Input
                    className="h-8 w-28"
                    type="number"
                    step="0.01"
                    value={scale.minScore ?? 0}
                    onChange={(e) =>
                      onChange(
                        scales.map((item, i) =>
                          i === index ? { ...item, minScore: Number(e.target.value) } : item
                        )
                      )
                    }
                  />
                </td>
                <td className="py-3">
                  <Input
                    className="h-8 w-28"
                    type="number"
                    step="0.01"
                    value={scale.maxScore ?? 0}
                    onChange={(e) =>
                      onChange(
                        scales.map((item, i) =>
                          i === index ? { ...item, maxScore: Number(e.target.value) } : item
                        )
                      )
                    }
                  />
                </td>
                <td className="py-3">
                  <Input
                    className="h-8 w-32"
                    type="number"
                    step="0.01"
                    value={scale.minCodingScore ?? 0}
                    onChange={(e) =>
                      onChange(
                        scales.map((item, i) =>
                          i === index ? { ...item, minCodingScore: Number(e.target.value) } : item
                        )
                      )
                    }
                  />
                </td>
                <td className="py-3 pr-6">
                  <input
                    type="checkbox"
                    checked={scale.isActive ?? false}
                    onChange={(e) =>
                      onChange(
                        scales.map((item, i) =>
                          i === index ? { ...item, isActive: e.target.checked } : item
                        )
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Đang lưu..." : "Lưu bộ scale"}
        </Button>
      </div>
    </div>
  );
}
