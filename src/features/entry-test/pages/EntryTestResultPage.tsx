import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Code2,
  FileQuestion,
  Gauge,
  RefreshCw,
  Target,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useCompetency, useEntryTestResult } from "../hooks/useEntryTestAttempt";

const levelLabels = {
  INTERN: "Intern",
  FRESHER: "Fresher",
  JUNIOR: "Junior",
  MIDDLE: "Middle",
} as const;

export function EntryTestResultPage() {
  const navigate = useNavigate();
  const attemptId = Number(useParams().id);
  const result = useEntryTestResult(Number.isSafeInteger(attemptId) ? attemptId : null);
  const competency = useCompetency(result.data?.status === "GRADED");

  if (result.isLoading)
    return (
      <div className="space-y-4 bg-slate-50 p-6 dark:bg-slate-950">
        <Skeleton className="h-44" />
        <Skeleton className="h-64" />
      </div>
    );
  if (result.isError || !result.data)
    return (
      <StateMessage
        title="Không thể tải kết quả"
        description="Bài làm không tồn tại, không thuộc tài khoản này hoặc kết nối đang gián đoạn."
        action="Thử lại"
        onAction={() => void result.refetch()}
      />
    );
  if (result.data.status !== "GRADED")
    return (
      <StateMessage
        title="Bài đánh giá chưa được chấm"
        description="Bài làm này vẫn đang ở trạng thái thực hiện. Điểm và cấp độ sẽ chỉ hiển thị sau khi backend chấm hoàn tất."
        action="Tiếp tục làm bài"
        onAction={() => navigate(`/user/entry-test/session/${attemptId}`)}
      />
    );

  const attempt = result.data;
  const finalScore = attempt.finalScore ?? 0;
  const level = attempt.resultLevel ? levelLabels[attempt.resultLevel] : "Chưa xếp hạng";
  const sections = [
    {
      label: "Kiến thức chung",
      score: attempt.commonQuizScore ?? 0,
      icon: FileQuestion,
      color: "bg-sky-500",
    },
    {
      label: "Kiến thức chuyên môn",
      score: attempt.specificQuizScore ?? 0,
      icon: Target,
      color: "bg-indigo-500",
    },
    {
      label: "Lập trình",
      score: attempt.specificCodingScore ?? 0,
      icon: Code2,
      color: "bg-emerald-500",
    },
  ];

  return (
    <main className="min-h-full bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 bg-white px-5 py-8 md:px-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold">Đã hoàn thành và chấm điểm</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl dark:text-white">
              Kết quả Entry Test
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Bài #{attempt.id} · Nộp lúc{" "}
              {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString("vi-VN") : "-"}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/user/entry-test")}>
            <ArrowLeft className="h-4 w-4" /> Về trang đánh giá
          </Button>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-7 md:px-8">
        <div className="grid gap-6 md:grid-cols-[0.9fr_1.6fr]">
          <aside className="rounded-lg bg-indigo-700 p-6 text-white">
            <div className="flex items-center gap-2 text-indigo-100">
              <Gauge className="h-4 w-4" />
              <span className="text-sm font-medium">Tổng điểm</span>
            </div>
            <p className="mt-4 text-5xl font-bold">
              {formatScore(finalScore)}
              <span className="text-lg font-medium text-indigo-200"> / 100</span>
            </p>
            <div className="mt-6 border-t border-indigo-500 pt-5">
              <p className="text-xs text-indigo-200">Cấp độ hiện tại</p>
              <div className="mt-2 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-300" />
                <p className="text-xl font-bold">{level}</p>
              </div>
            </div>
          </aside>
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Chi tiết theo phần</h2>
            <div className="mt-5 space-y-5">
              {sections.map(({ label, score, icon: Icon, color }) => (
                <div key={label}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-slate-500" />
                      {label}
                    </span>
                    <strong className="text-sm">{formatScore(score)} điểm</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full ${color}`}
                      style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              Điểm do backend chấm từ đáp án quiz và hidden tests. Kết quả chạy thử code không được
              dùng để tự tính điểm.
            </p>
          </div>
        </div>
        <div className="mt-6 border-y border-slate-200 bg-white px-5 py-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold">Hồ sơ năng lực đã được cập nhật</h2>
              <p className="mt-1 text-sm text-slate-500">
                {competency.data
                  ? `Định hướng ${competency.data.targetRole} · ${competency.data.languagesJson.join(", ")}`
                  : "Hệ thống đang đồng bộ bản đánh giá mới nhất."}
              </p>
            </div>
            <Button onClick={() => navigate("/user/entry-test")}>
              <RefreshCw className="h-4 w-4" /> Xem tổng quan
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function StateMessage({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50">
          <Award className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-lg font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        <Button className="mt-5" onClick={onAction}>
          {action}
        </Button>
      </div>
    </div>
  );
}
