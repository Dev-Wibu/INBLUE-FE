import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  RefreshCw,
  Route,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeApiError } from "@/lib/error-normalizer";
import { useAuthStore } from "@/stores/authStore";

import { CareerPreferenceWizard } from "../components/CareerPreferenceWizard";
import { EntryTestStartDialog } from "../components/EntryTestStartDialog";
import { useCareerPreference, useCareerPreferenceExists } from "../hooks/useCareerPreference";
import { useCompetency, useStartEntryTest } from "../hooks/useEntryTestAttempt";
import type { EntryTestDraftV1 } from "../types/entry-test.types";
import { getActiveAttemptId, saveEntryTestDraft } from "../utils/entry-test-storage";

export function EntryTestLandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = Number(useAuthStore((state) => state.user?.id));
  const exists = useCareerPreferenceExists(Number.isSafeInteger(userId));
  const preference = useCareerPreference(exists.data === true);
  const competency = useCompetency(true);
  const start = useStartEntryTest();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(() =>
    Boolean((location.state as { openStartDialog?: boolean } | null)?.openStartDialog)
  );
  const activeAttemptId = Number.isSafeInteger(userId) ? getActiveAttemptId(userId) : null;

  const handleStart = async () => {
    if (!preference.data?.targetRole) {
      setStartOpen(false);
      setWizardOpen(true);
      return;
    }
    try {
      const test = await start.mutateAsync();
      const firstSection =
        [...test.sectionConfigs].sort((a, b) => a.displayOrder - b.displayOrder)[0]?.sectionType ??
        "COMMON_QUIZ";
      const draft: EntryTestDraftV1 = {
        version: 1,
        userId,
        attemptId: test.attemptId,
        entryTestId: test.entryTestId,
        timeLimitMinutes: test.timeLimitMinutes,
        deadlineEpochMs: Date.now() + test.timeLimitMinutes * 60_000,
        currentSection: firstSection,
        currentItemId: null,
        quizDrafts: {},
        codingDrafts: {},
        testSnapshot: test,
        savedAt: new Date().toISOString(),
      };
      saveEntryTestDraft(draft);
      navigate(`/user/entry-test/session/${test.attemptId}`);
    } catch (error) {
      const normalized = normalizeApiError(error, "Không thể tạo đề Entry Test.");
      toast.error(
        normalized.rawMessage?.includes("Not enough items")
          ? "Hệ thống chưa có đủ câu hỏi cho định hướng này. Vui lòng thử lại sau."
          : normalized.message
      );
    }
  };

  if (exists.isLoading)
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  return (
    <main className="flex min-h-full flex-col bg-slate-50 dark:bg-slate-950">
      <section className="flex flex-none flex-col justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 sm:flex-row sm:items-center md:px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
              Hồ sơ năng lực đầu vào
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              Định hướng, bài đánh giá và kết quả gần nhất
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {competency.data && (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Đã đánh giá
            </span>
          )}
          {activeAttemptId && (
            <Button
              variant="outline"
              className="h-8 text-xs"
              onClick={() => navigate(`/user/entry-test/session/${activeAttemptId}`)}>
              <RefreshCw className="h-3.5 w-3.5" /> Tiếp tục bài đang làm
            </Button>
          )}
          <Button
            className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700"
            onClick={() =>
              preference.data?.targetRole ? setStartOpen(true) : setWizardOpen(true)
            }>
            {preference.data?.targetRole ? "Bắt đầu Entry Test" : "Chọn định hướng"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>
      <section className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 md:px-8">
        <div className="mb-6 max-w-3xl">
          <h1 className="text-xl font-bold text-slate-950 dark:text-white">
            Xác định năng lực khởi điểm
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Hoàn thành bài đánh giá theo định hướng để nhận mức năng lực hiện tại và lộ trình học
            phù hợp.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-base font-semibold">Bài đánh giá gồm những gì?</h2>
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              <Feature
                icon={ClipboardCheck}
                title="Kiến thức nền tảng"
                text="Đánh giá tư duy chung và kiến thức cốt lõi trong môi trường công nghệ."
              />
              <Feature
                icon={Route}
                title="Kiến thức theo định hướng"
                text="Câu hỏi được chọn theo vai trò và nhóm kỹ năng bạn đã khai báo."
              />
              <Feature
                icon={Code2}
                title="Bài tập lập trình"
                text="Viết và chạy thử code với ví dụ hiển thị trước khi nộp qua bộ test ẩn."
              />
            </div>
          </div>
          <aside>
            <h2 className="text-base font-semibold">Hồ sơ đánh giá</h2>
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              {competency.data ? (
                <>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-semibold">Đã có kết quả gần nhất</span>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">
                    {competency.data.currentScore}
                    <span className="text-base font-medium text-slate-400"> / 100</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Cấp độ {competency.data.currentLevel}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-5 w-full"
                    onClick={() =>
                      navigate(`/user/entry-test/result/${competency.data.lastEntryTestAttemptId}`)
                    }>
                    Xem kết quả chi tiết
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">Chưa có đánh giá năng lực</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Kết quả sẽ xuất hiện tại đây sau khi bạn hoàn thành Entry Test đầu tiên.
                  </p>
                </>
              )}
            </div>
            {preference.data?.targetRole && (
              <div className="mt-3 border-y border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-slate-500">Định hướng hiện tại</span>
                <p className="mt-1 font-semibold">
                  {preference.data.targetRole} ·{" "}
                  {(preference.data.languagesJson ?? []).join(", ") || "Chưa chọn kỹ năng"}
                </p>
                <button
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  onClick={() => setWizardOpen(true)}>
                  Cập nhật định hướng
                </button>
              </div>
            )}
          </aside>
        </div>
      </section>
      <CareerPreferenceWizard
        open={wizardOpen}
        initialPreference={preference.data}
        onOpenChange={setWizardOpen}
        onSaved={(saved) => {
          setWizardOpen(false);
          if (!saved.targetRole)
            toast.info("Bạn có thể chọn định hướng bất cứ lúc nào trước khi bắt đầu.");
        }}
      />
      <EntryTestStartDialog
        open={startOpen}
        pending={start.isPending}
        onOpenChange={setStartOpen}
        onConfirm={handleStart}
      />
    </main>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Code2; title: string; text: string }) {
  return (
    <div className="flex gap-4 p-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
      </div>
    </div>
  );
}
