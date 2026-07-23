import type { RoundType, UIRound } from "@/components/shared/RoundCanvasEditor";
import {
  getAvailableRoundsTemplates,
  RoundCanvasEditorWorkspace,
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
  const [currentJd, setCurrentJd] = useState<JobDescription>(jobDescription);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null);
  const [isJdInfoExpanded, setIsJdInfoExpanded] = useState(false);

  React.useEffect(() => {
    setCurrentJd(jobDescription);
    setSelectedRoundIndex(null);
    setIsJdInfoExpanded(false);
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
          codingProblemsId: r.configData?.codingProblemsId ?? [],
          codeReviewIds: r.configData?.codeReviewProblemsId ?? [],
        },
      }));

      const jdId = currentJd.id!;
      const hasExistingRounds = (currentJd.rounds?.length ?? 0) > 0;
      const endpointResult = hasExistingRounds
        ? await roundManager.updateForJd(jdId, { rounds: payloadRounds })
        : await roundManager.setUpForJd(jdId, { rounds: payloadRounds });

      const res = endpointResult;

      if (res.success && res.data) {
        toast.success(t("general.updateSuccess"));
        setCurrentJd((prev) =>
          prev ? { ...prev, rounds: res.data as unknown as typeof prev.rounds } : prev
        );
      } else {
        toast.error(
          res.error ||
            t(
              hasExistingRounds
                ? "errors.cannotUpdateInterviewRounds"
                : "errors.cannotSetUpInterviewRounds"
            )
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
    ? templates.find((template) => template.type === selectedRound.roundType)
    : null;

  const formatRoundDuration = (round: (typeof initialRounds)[number]) => {
    const duration = round.configData?.timeLimitMinutes;
    if (!duration) return "Không giới hạn";

    if (round.roundType === "MENTOR_REVIEW" || round.roundType === "MENTROR_REVIEW") {
      return `${duration / 1440} ngày`;
    }

    return `${duration} phút`;
  };

  const jdInfoSections = [
    {
      key: "description",
      label: t("common.description", "Mô tả"),
      value: currentJd.description,
    },
    {
      key: "requirements",
      label: t("common.requirements", "Yêu cầu"),
      value: currentJd.requirements,
    },
    {
      key: "benefits",
      label: t("common.benefits", "Quyền lợi"),
      value: currentJd.benefits,
    },
  ];
  const shouldShowJdInfoToggle = jdInfoSections.some(
    (section) => (section.value?.length ?? 0) > 180
  );

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="border-border/50 sticky top-0 z-10 border-b bg-white/80 px-6 py-4 backdrop-blur-xl dark:bg-slate-900/80">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight break-words text-slate-900 dark:text-white">
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

      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)] lg:p-6">
          <main className="min-w-0">
            {selectedRound ? (
              <div className="animate-in fade-in slide-in-from-right-4 space-y-6 duration-300">
                <button
                  type="button"
                  onClick={() => setSelectedRoundIndex(null)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400">
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại quy trình phỏng vấn
                </button>

                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold break-words text-slate-900 dark:text-white">
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
                    className="w-fit gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Edit3 className="h-4 w-4" />
                    {t("general.edit")} vòng này
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Thời gian
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-white">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {formatRoundDuration(selectedRound)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Điểm tối đa
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-white">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      {selectedRound.configData?.maxScore ?? 100}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Điểm qua
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-white">
                      <FileText className="h-4 w-4 text-blue-500" />
                      {Math.round((selectedRound.passThreshold ?? 0.8) * 100)}%
                    </div>
                  </div>
                </div>

                {selectedRound.configData?.instruction && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Hướng dẫn ứng viên
                    </h3>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 whitespace-pre-wrap text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      {selectedRound.configData.instruction}
                    </div>
                  </div>
                )}

                {selectedRound.roundType === "QUIZ" && selectedRound.configData?.quizQuestions && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Bộ câu hỏi trắc nghiệm
                    </h3>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      Đã cấu hình {selectedRound.configData.quizQuestions.length} câu hỏi.
                    </div>
                  </div>
                )}

                {selectedRound.roundType === "CODING" &&
                  selectedRound.configData?.codingProblems && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Bài tập lập trình
                      </h3>
                      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        Đã cấu hình {selectedRound.configData.codingProblems.length} bài tập.
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="animate-in fade-in space-y-5 duration-300">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t("common.interviewProcess", "Quy trình phỏng vấn")}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {initialRounds.length} vòng đã cấu hình
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit gap-2"
                    onClick={() => setIsEditorOpen(true)}>
                    <Edit3 className="h-3.5 w-3.5" />
                    {t("general.edit")}
                  </Button>
                </div>

                {!initialRounds || initialRounds.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Chưa cấu hình vòng phỏng vấn nào
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Thêm vòng đầu tiên để thiết lập quy trình phỏng vấn cho JD này.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-dashed"
                      onClick={() => setIsEditorOpen(true)}>
                      + Thêm vòng phỏng vấn
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {initialRounds.map((round, index) => {
                      const meta = templates.find((template) => template.type === round.roundType);

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedRoundIndex(index)}
                          className="group grid w-full grid-cols-[auto_1fr] gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20 dark:focus-visible:ring-offset-slate-950">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white shadow-sm dark:border-slate-900",
                                meta?.bgColor,
                                meta?.color
                              )}>
                              {meta?.icon}
                            </div>
                            {index < initialRounds.length - 1 && (
                              <div className="mt-3 h-12 w-px bg-slate-200 dark:bg-slate-800" />
                            )}
                          </div>
                          <div className="min-w-0 pb-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Vòng {index + 1}
                                  </span>
                                  <Badge variant="outline" className={cn("gap-1.5", meta?.color)}>
                                    {meta?.title}
                                  </Badge>
                                </div>
                                <h4 className="mt-2 text-base font-semibold break-words text-slate-900 dark:text-white">
                                  {round.name}
                                </h4>
                              </div>
                              <span className="text-xs font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                                Xem chi tiết
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                <Clock className="h-3.5 w-3.5" />
                                {formatRoundDuration(round)}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                Tối đa {round.configData?.maxScore ?? 100}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                <FileText className="h-3.5 w-3.5 text-blue-500" />
                                Qua {Math.round((round.passThreshold ?? 0.8) * 100)}%
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => setIsEditorOpen(true)}>
                      + Thêm vòng phỏng vấn
                    </Button>
                  </div>
                )}
              </div>
            )}
          </main>

          <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Thông tin JD
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Mô tả, yêu cầu và quyền lợi
                </p>
              </div>

              <div className={cn("relative overflow-hidden", !isJdInfoExpanded && "max-h-[420px]")}>
                <div>
                  {jdInfoSections.map((section, index) => (
                    <section
                      key={section.key}
                      className={cn(
                        "px-4 py-4",
                        index > 0 && "border-t border-slate-100 dark:border-slate-800/70"
                      )}>
                      <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {section.label}
                      </h4>
                      {section.value ? (
                        <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                          {section.value}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400 italic dark:text-slate-500">
                          Chưa có thông tin
                        </p>
                      )}
                    </section>
                  ))}
                </div>
                {!isJdInfoExpanded && shouldShowJdInfoToggle && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-slate-900" />
                )}
              </div>

              {shouldShowJdInfoToggle && (
                <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800/70">
                  <button
                    type="button"
                    onClick={() => setIsJdInfoExpanded((prev) => !prev)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300">
                    {isJdInfoExpanded ? "Thu gọn" : "Xem thêm"}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {isEditorOpen && (
        <RoundCanvasEditorWorkspace
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialRounds={initialRounds}
          initialMetadata={{ name: jd.title, category: "", description: "" }}
          title="Quy trình tuyển dụng JD"
          showMetadataInputs={false}
          isSaving={isSaving}
          onSave={handleSaveRounds}
        />
      )}
    </div>
  );
}
