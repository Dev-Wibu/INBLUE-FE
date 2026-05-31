import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  buildPracticeQuizResultPath,
  buildPracticeSessionPath,
  toPositiveIntegerParam,
} from "@/lib/practice-quiz-route";
import { quizSetManager } from "@/services";
import type { QuizItem, QuizItemResponse, QuizSet } from "@/services/quiz-set.manager";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, ArrowRight, CheckCircle, ClipboardList, LogOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
export function QuizPage() {
  const { t } = useTranslation();
  const { sessionId, practiceSetId, quizId } = useParams<{
    sessionId: string;
    practiceSetId: string;
    quizId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Keyed by item.id for collision-free indexing
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const numericSessionId = toPositiveIntegerParam(sessionId);
  const numericPracticeSetId = toPositiveIntegerParam(practiceSetId);
  const numericQuizId = toPositiveIntegerParam(quizId);
  const defaultBackUrl = numericSessionId
    ? buildPracticeSessionPath(numericSessionId)
    : "/user?tab=practice";
  const location = useLocation();
  const locationState = location.state as {
    initialItems?: QuizItemResponse[];
    backUrl?: string;
  } | null;
  // Capture items passed via navigation state from createFullAi (read once on mount)
  const initialItemsRef = useRef(locationState?.initialItems);

  // Persist backUrl in sessionStorage so it survives F5 refresh
  const storageKey = `quiz_backUrl_${sessionId ?? "unknown"}_${practiceSetId ?? "unknown"}_${quizId ?? "unknown"}`;
  const [backUrl, setBackUrl] = useState<string>(() => {
    if (locationState?.backUrl) {
      try {
        sessionStorage.setItem(storageKey, locationState.backUrl);
      } catch {
        /* ignore */
      }
      return locationState.backUrl;
    }
    try {
      return sessionStorage.getItem(storageKey) ?? defaultBackUrl;
    } catch {
      return defaultBackUrl;
    }
  });
  const loadData = useCallback(async () => {
    if (!numericQuizId || !numericSessionId || !numericPracticeSetId) {
      toast.error(t("userPractice.invalidTestPath"));
      navigate("/user?tab=practice", {
        replace: true,
      });
      return;
    }
    setLoading(true);
    try {
      const preloaded = initialItemsRef.current;
      if (preloaded?.length) {
        // Items came from createFullAi response — only fetch quiz metadata
        setQuizItems(preloaded as unknown as QuizItem[]);
        const setRes = await quizSetManager.getById(numericQuizId);
        if (setRes.success && setRes.data) {
          setQuizSet(setRes.data);
          setBackUrl(defaultBackUrl);
          try {
            sessionStorage.setItem(storageKey, defaultBackUrl);
          } catch {
            /* ignore */
          }
        }
      } else {
        // Load full quiz; GET /api/quiz-sets/{quizId} returns QuizSet with embedded questions[]
        const setRes = await quizSetManager.getById(numericQuizId);
        if (setRes.success && setRes.data) {
          setQuizSet(setRes.data);
          setQuizItems(setRes.data.questions ?? []);
          setBackUrl(defaultBackUrl);
          try {
            sessionStorage.setItem(storageKey, defaultBackUrl);
          } catch {
            /* ignore */
          }
        } else {
          toast.error(t("userPractice.noTestsFound"));
        }
      }
    } catch {
      toast.error(t("userPractice.unableToDownloadQuizData"));
    } finally {
      setLoading(false);
    }
  }, [
    defaultBackUrl,
    navigate,
    numericPracticeSetId,
    numericQuizId,
    numericSessionId,
    storageKey,
    t,
  ]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  const parseOptions = (optionsStr?: string): Record<string, string> => {
    if (!optionsStr) return {};
    try {
      const parsed = JSON.parse(optionsStr);
      // BE double-escapes the JSON -- if the parsed value is still a string, parse once more
      if (typeof parsed === "string") return JSON.parse(parsed) as Record<string, string>;
      return parsed as Record<string, string>;
    } catch {
      return {};
    }
  };
  const currentItem = quizItems[currentIndex];
  const options = parseOptions(currentItem?.options);
  const totalQuestions = quizItems.length;
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const currentAnswer = currentItem?.id !== undefined ? answers[currentItem.id] : undefined;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const handleSelectAnswer = (key: string) => {
    if (currentItem?.id === undefined) return;
    setAnswers((prev) => ({
      ...prev,
      [currentItem.id!]: key,
    }));
  };
  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) setCurrentIndex((prev) => prev + 1);
  };
  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };
  const handleSubmit = async () => {
    const qId = quizSet?.quizId;
    if (!qId) {
      toast.error(t("userPractice.noQuizzesToSubmit"));
      return;
    }
    // Backend expects Map<Integer, String>: { "<itemId>": "<selectedOption>" }
    const payload: Record<string, string> = {};
    for (const item of quizItems) {
      if (item.id !== undefined && answers[item.id] !== undefined) {
        payload[String(item.id)] = answers[item.id];
      }
    }
    setSubmitting(true);
    try {
      const response = await quizSetManager.submit(qId, payload);
      if (response.success) {
        toast.success(t("userPractice.submittedSuccessfully"));
        if (!numericSessionId || !numericPracticeSetId) {
          toast.error(t("userPractice.cannotOpenResultsBecauseTraining"));
          return;
        }
        navigate(
          buildPracticeQuizResultPath({
            sessionId: numericSessionId,
            practiceSetId: numericPracticeSetId,
            quizId: qId,
          }),
          {
            state: {
              backUrl,
            },
          }
        );
      } else {
        toast.error(response.error ?? t("userPractice.unableToSubmitAssignment"));
      }
    } catch {
      toast.error(t("userPractice.unableToSubmitAssignment"));
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) {
    return (
      <div className="bg-background min-h-screen p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
    );
  }
  if (quizItems.length === 0) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <p className="text-foreground font-medium">{t("userPractice.thereAreNoQuestionsIn")}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(backUrl)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("general.back")}
          </Button>
        </Card>
      </div>
    );
  }
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        {/* Header */}
        <Card className="overflow-hidden border-[#0047AB]/20 bg-linear-to-r from-[#0047AB] to-[#007BFF]">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {quizSet?.quizName ?? t("userPractice.multipleChoiceTest")}
                </p>
                <p className="text-xs text-white/80">
                  {user?.name ?? t("userPractice.candidate")} {t("userPractice.codeQ")}
                  {quizSet?.quizId}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-white hover:bg-white/20 hover:text-white"
              onClick={() => navigate(backUrl)}>
              <LogOut className="h-4 w-4" />
              {t("userPractice.exit")}
            </Button>
          </CardContent>
        </Card>

        {/* Progress + numbered navigation dots */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">
                {t("userPractice.progressOfHomework")}
              </span>
              <span className="text-muted-foreground font-medium">
                {answeredCount} / {totalQuestions} {t("common.question")}
              </span>
            </div>
            <Progress value={progress} className="mb-3 h-1.5" />
            <div className="flex flex-wrap gap-1.5">
              {quizItems.map((item, idx) => {
                const isAnswered = item.id !== undefined && answers[item.id] !== undefined;
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition-all ${isCurrent ? "bg-[#0047AB] text-white shadow-sm ring-2 ring-[#0047AB]/40" : isAnswered ? "bg-[#DCEEFF] text-[#0047AB]" : "bg-muted text-muted-foreground hover:bg-[#DCEEFF] hover:text-[#0047AB]"}`}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Question card */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-5">
              <Badge className="bg-[#DCEEFF] text-xs font-bold text-[#0047AB]">
                {t("general.question1")} {currentIndex + 1}
              </Badge>
              <p className="text-foreground mt-3 text-base leading-relaxed font-semibold">
                {currentItem?.question}
              </p>
            </div>
            <div className="space-y-3">
              {Object.entries(options).map(([key, value]) => {
                const isSelected = currentAnswer === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectAnswer(key)}
                    className={`w-full rounded-lg border p-4 text-left transition-all ${isSelected ? "border-[#0047AB] bg-[#DCEEFF] dark:bg-[#0047AB]/10" : "border-border hover:bg-muted hover:border-[#0047AB]/50"}`}>
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-[#0047AB] bg-[#0047AB]" : "border-muted-foreground"}`}>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs font-medium">
                          {t("userPractice.select")} {key}
                        </span>
                        <p className="text-foreground text-sm leading-relaxed">{value}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("general.back")}
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 bg-[#0047AB] hover:bg-[#003580]">
              {submitting ? (
                <Spinner size="sm" tone="white" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {t("userPractice.submitYourAssignment")}
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2 bg-[#0047AB] hover:bg-[#003580]">
              {t("common.next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
