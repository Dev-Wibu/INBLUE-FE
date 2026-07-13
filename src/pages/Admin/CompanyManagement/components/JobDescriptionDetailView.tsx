import type { RoundType, UIRound } from "@/components/shared/RoundCanvasEditor";
import {
  getAvailableRoundsTemplates,
  RoundCanvasEditorDialog,
} from "@/components/shared/RoundCanvasEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { roundManager } from "@/services/round.manager";
import { ArrowLeft, CheckCircle, ChevronLeft, Clock, Edit3, FileText } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { JobDescription } from "../types";

interface JobDescriptionDetailViewProps {
  jobDescription: JobDescription;
  onBack: () => void;
  onEdit: (job: JobDescription) => void;
}

export function JobDescriptionDetailView({
  jobDescription,
  onBack,
  onEdit,
}: JobDescriptionDetailViewProps) {
  const { t } = useTranslation();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Keep local state of JD
  const [currentJd, setCurrentJd] = useState<JobDescription>(jobDescription);
  // Track selected round to show in middle column
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null);

  React.useEffect(() => {
    setCurrentJd(jobDescription);
    setSelectedRoundIndex(null);
  }, [jobDescription]);

  const initialRounds = React.useMemo(() => {
    const sortedRounds = [...(currentJd.rounds || [])].sort(
      (a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0)
    );
    return sortedRounds.map((r) => ({
      name: r.name,
      roundType: r.roundType as RoundType,
      passThreshold: r.passThreshold ?? 0.8,
      configData: {
        ...r.configData,
        codingProblemsId:
          r.configData?.codingProblems
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ?.map((cp: any) => cp.problemId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((id: any): id is number => id !== undefined) ?? [],
        codingProblems: r.configData?.codingProblems ?? [],
        codeReviewProblemsId:
          r.configData?.codeReviewProblems
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ?.map((cp: any) => cp.problemId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((id: any): id is number => id !== undefined) ?? [],
        codeReviewProblems: r.configData?.codeReviewProblems ?? [],
      },
    }));
  }, [currentJd.rounds]);

  const handleSaveRounds = async (rounds: UIRound[]) => {
    setIsSaving(true);
    try {
      const payloadRounds = rounds.map((r, idx) => ({
        name: r.name || `Vòng ${idx + 1}`,
        roundOrder: idx + 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        roundType: r.roundType as any,
        passThreshold: Number(r.passThreshold ?? 0.8),
        configData: {
          instruction: r.configData?.instruction || "",
          submissionFormat: r.configData?.submissionFormat || "",
          timeLimitMinutes: Number(r.configData?.timeLimitMinutes ?? 0),
          maxScore: Number(r.configData?.maxScore ?? 100),
          aiSystemPrompt: r.configData?.aiSystemPrompt || "",
          evaluationCriteria: r.configData?.evaluationCriteria || "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          quizQuestions: (r.configData?.quizQuestions || []).map((q: any) => ({
            questionText: q.questionText || "",
            options: q.options || [],
            correctAnswer: q.correctAnswer || "",
            points: Number(q.points ?? 0),
          })),
          codingProblems:
            r.configData?.codingProblemsId?.map((id) => {
              const cp = r.configData?.codingProblems?.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (problem: any) => problem.problemId === id
              );
              return {
                problemId: id,
                title: cp?.title || `Bài tập #${id}`,
                difficulty: (cp?.difficulty as "EASY" | "MEDIUM" | "HARD") || "MEDIUM",
              };
            }) ?? [],
          codeReviewIds: r.configData?.codeReviewProblemsId || [],
          codeReviewProblems:
            r.configData?.codeReviewProblemsId?.map((id) => {
              const cp = r.configData?.codeReviewProblems?.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (problem: any) => problem.problemId === id
              );
              return {
                problemId: id,
                title: cp?.title || `Bài tập #${id}`,
                difficulty: (cp?.difficulty as "EASY" | "MEDIUM" | "HARD") || "MEDIUM",
                language: cp?.language || "Java",
              };
            }) ?? [],
        },
      }));

      // 2026-07-13 fix: BE has 2 distinct endpoints for rounds — pick the
      //   right one based on whether this JD already has rounds configured.
      //   The previous code was hitting PUT /api/job-descriptions with a
      //   {rounds:[...]} body which BE silently dropped, leaving `status`
      //   null on the partial update and tripping a NOT NULL constraint.
      const jdId = currentJd.id!;
      const hasExistingRounds = (currentJd.rounds?.length ?? 0) > 0;
      const endpointResult = hasExistingRounds
        ? await roundManager.updateForJd(jdId, { rounds: payloadRounds })
        : await roundManager.setUpForJd(jdId, { rounds: payloadRounds });

      const res = endpointResult;

      if (res.success && res.data) {
        toast.success(t("general.updateSuccess"));
        // The PUT /api/rounds/jd/{id}[/update] endpoint returns only the
        // updated rounds — merge them back so we don't overwrite JD metadata.
        setCurrentJd((prev) =>
          prev ? { ...prev, rounds: res.data as unknown as typeof prev.rounds } : prev
        );
      } else {
        toast.error(
          res.error ||
            t(hasExistingRounds
              ? "errors.cannotUpdateInterviewRounds"
              : "errors.cannotSetUpInterviewRounds")
        );
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("errors.cannotUpdateInterviewRounds"));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const templates = getAvailableRoundsTemplates(t);

  const selectedRound = selectedRoundIndex !== null ? initialRounds[selectedRoundIndex] : null;
  const selectedRoundMeta = selectedRound
    ? templates.find((t) => t.type === selectedRound.roundType)
    : null;

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-border/50 sticky top-0 z-10 border-b bg-white/80 px-6 py-4 backdrop-blur-xl dark:bg-slate-900/80">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {currentJd.title}
              </h2>
              <Badge variant={currentJd.status === "OPEN" ? "default" : "secondary"}>
                {currentJd.status}
              </Badge>
              <Badge variant="outline">{currentJd.level}</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onEdit(currentJd)}>
            {t("general.edit")}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Job Info OR Round Info */}
        <div className="border-border/50 relative w-2/3 overflow-y-auto border-r p-6">
          {selectedRound ? (
            <div className="animate-in fade-in slide-in-from-right-4 mx-auto max-w-3xl space-y-8 duration-300">
              <button
                onClick={() => setSelectedRoundIndex(null)}
                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400">
                <ArrowLeft className="h-4 w-4" />
                Quay lại thông tin JD
              </button>

              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {selectedRound.name}
                  </h2>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className={cn("gap-1.5", selectedRoundMeta?.color)}>
                      {selectedRoundMeta?.icon &&
                        React.cloneElement(
                          selectedRoundMeta.icon as React.ReactElement<{ className?: string }>,
                          {
                            className: "h-3.5 w-3.5",
                          }
                        )}
                      {selectedRoundMeta?.title}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => setIsEditorOpen(true)}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Edit3 className="h-4 w-4" />
                  {t("general.edit")} Vòng này
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Thời gian
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {selectedRound.configData?.timeLimitMinutes
                      ? `${selectedRound.configData.timeLimitMinutes} Phút`
                      : "Không giới hạn"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Điểm tối đa
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    {selectedRound.configData?.maxScore ?? 100}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Điểm qua môn
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
                    <FileText className="h-4 w-4 text-blue-500" />
                    {Math.round((selectedRound.passThreshold ?? 0.8) * 100)}%
                  </div>
                </div>
              </div>

              {selectedRound.configData?.instruction && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold tracking-wider text-slate-500 uppercase">
                    Hướng dẫn ứng viên
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {selectedRound.configData.instruction}
                  </div>
                </div>
              )}

              {selectedRound.roundType === "QUIZ" && selectedRound.configData?.quizQuestions && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold tracking-wider text-slate-500 uppercase">
                    Bộ câu hỏi trắc nghiệm
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    Đã cấu hình {selectedRound.configData.quizQuestions.length} câu hỏi.
                  </div>
                </div>
              )}

              {selectedRound.roundType === "CODING" && selectedRound.configData?.codingProblems && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold tracking-wider text-slate-500 uppercase">
                    Bài tập lập trình
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    Đã cấu hình {selectedRound.configData.codingProblems.length} bài tập.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in mx-auto max-w-3xl space-y-8 duration-300">
              <div>
                <h3 className="mb-3 text-sm font-semibold tracking-wider text-slate-500 uppercase">
                  {t("common.description", "Mô tả công việc")}
                </h3>
                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                  {currentJd.description ? (
                    <div dangerouslySetInnerHTML={{ __html: currentJd.description }} />
                  ) : (
                    <span className="text-slate-400 italic">Chưa có thông tin</span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold tracking-wider text-slate-500 uppercase">
                  {t("common.requirements", "Yêu cầu")}
                </h3>
                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                  {currentJd.requirements ? (
                    <div dangerouslySetInnerHTML={{ __html: currentJd.requirements }} />
                  ) : (
                    <span className="text-slate-400 italic">Chưa có thông tin</span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold tracking-wider text-slate-500 uppercase">
                  {t("common.benefits", "Quyền lợi")}
                </h3>
                <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                  {currentJd.benefits ? (
                    <div dangerouslySetInnerHTML={{ __html: currentJd.benefits }} />
                  ) : (
                    <span className="text-slate-400 italic">Chưa có thông tin</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Rounds Timeline */}
        <div className="w-1/3 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("common.interviewProcess", "Quy trình phỏng vấn")}
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsEditorOpen(true)}>
              <Edit3 className="h-3.5 w-3.5" />
              {t("general.edit")}
            </Button>
          </div>

          <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent md:before:mx-auto md:before:translate-x-0">
            {!initialRounds || initialRounds.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Chưa cấu hình vòng phỏng vấn nào.
              </div>
            ) : (
              initialRounds.map((round, index) => {
                const meta = templates.find((t) => t.type === round.roundType);
                const isSelected = selectedRoundIndex === index;

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedRoundIndex(index)}
                    className={cn(
                      "group is-active relative flex cursor-pointer items-center justify-between transition-all md:justify-normal md:odd:flex-row-reverse",
                      isSelected ? "scale-105" : "opacity-70 hover:scale-105 hover:opacity-90"
                    )}>
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white shadow transition-colors md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 dark:border-slate-900",
                        meta?.bgColor,
                        meta?.color,
                        isSelected
                          ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950"
                          : ""
                      )}>
                      {meta?.icon}
                    </div>
                    <div
                      className={cn(
                        "w-[calc(100%-4rem)] rounded-xl border p-4 shadow-sm transition-colors md:w-[calc(50%-2.5rem)]",
                        isSelected
                          ? "border-indigo-500 bg-white shadow-md dark:border-indigo-400 dark:bg-slate-900"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      )}>
                      <div className="mb-1 flex items-center justify-between">
                        <div
                          className={cn(
                            "font-bold",
                            isSelected
                              ? "text-indigo-700 dark:text-indigo-400"
                              : "text-slate-900 dark:text-slate-100"
                          )}>
                          {round.name}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {meta?.title} •{" "}
                        {round.configData?.timeLimitMinutes
                          ? `${round.configData.timeLimitMinutes}m`
                          : "∞"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-8 text-center">
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setIsEditorOpen(true)}>
              + Thêm vòng phỏng vấn
            </Button>
          </div>
        </div>
      </div>

      {isEditorOpen && (
        <RoundCanvasEditorDialog
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialRounds={initialRounds}
          showMetadataInputs={false}
          isSaving={isSaving}
          onSave={handleSaveRounds}
        />
      )}
    </div>
  );
}
