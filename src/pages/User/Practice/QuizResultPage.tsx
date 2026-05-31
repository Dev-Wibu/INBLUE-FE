import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SpinnerBlock } from "@/components/ui/spinner";
import { buildPracticeSessionPath, toPositiveIntegerParam } from "@/lib/practice-quiz-route";
import { quizSetManager } from "@/services";
import type { QuizItem, QuizSet } from "@/services/quiz-set.manager";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
export function QuizResultPage() {
  const { t } = useTranslation();
  const { sessionId, practiceSetId, quizId } = useParams<{
    sessionId: string;
    practiceSetId: string;
    quizId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const numericSessionId = toPositiveIntegerParam(sessionId);
  const numericPracticeSetId = toPositiveIntegerParam(practiceSetId);
  const numericQuizId = toPositiveIntegerParam(quizId);
  const defaultBackUrl = numericSessionId
    ? buildPracticeSessionPath(numericSessionId)
    : "/user?tab=practice";
  // Persist backUrl in sessionStorage so it survives F5 refresh
  const storageKey = `quiz_backUrl_${sessionId ?? "unknown"}_${practiceSetId ?? "unknown"}_${quizId ?? "unknown"}`;
  const [backUrl, setBackUrl] = useState<string>(() => {
    const stateUrl = (
      location.state as {
        backUrl?: string;
      } | null
    )?.backUrl;
    if (stateUrl) {
      try {
        sessionStorage.setItem(storageKey, stateUrl);
      } catch {
        /* ignore */
      }
      return stateUrl;
    }
    try {
      return sessionStorage.getItem(storageKey) ?? defaultBackUrl;
    } catch {
      return defaultBackUrl;
    }
  });
  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const loadData = useCallback(async () => {
    if (!numericQuizId || !numericSessionId || !numericPracticeSetId) {
      toast.error(t("userPractice.theTestResultPathIs"));
      navigate("/user?tab=practice", {
        replace: true,
      });
      return;
    }
    setLoading(true);
    try {
      // GET /api/quiz-sets/{quizId} returns QuizSet with embedded questions[]
      const quizResponse = await quizSetManager.getById(numericQuizId);
      if (quizResponse.success && quizResponse.data) {
        setQuizSet(quizResponse.data);
        setQuizItems(quizResponse.data.questions ?? []);
        setBackUrl(defaultBackUrl);
        try {
          sessionStorage.setItem(storageKey, defaultBackUrl);
        } catch {
          /* ignore */
        }
      } else {
        toast.error(t("userPractice.unableToDownloadQuizResults"));
      }
    } catch {
      toast.error(t("userPractice.unableToDownloadQuizResults"));
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
  const totalQuestions = quizItems.length;
  const correctCount = quizItems.filter(
    (item) => item.userResponse && item.userResponse === item.correctAnswer
  ).length;
  const fallbackScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0;
  const displayScore = quizSet?.score !== undefined ? quizSet.score : fallbackScore;
  const displayScoreText = t("general.points", {
    var_0: displayScore.toFixed(2),
  });
  if (loading) {
    return (
      <div className="bg-background">
        <SpinnerBlock fullScreen size="xl" />
      </div>
    );
  }
  return (
    <div className="bg-background min-h-screen p-8">
      <div className="mx-auto max-w-3xl">
        {/* Score Card */}
        <Card className="mb-8 overflow-hidden border-0 bg-linear-to-r from-[#0047AB] to-[#007BFF] py-0">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <h1 className="mb-4 text-2xl font-bold text-white">{t("userPractice.quizResults")}</h1>
            <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <span className="text-3xl font-bold text-white">{displayScoreText}</span>
            </div>
            <p className="text-lg text-white/90">
              {t("userPractice.youAnsweredCorrectly")} {correctCount} / {totalQuestions}{" "}
              {t("common.question1")}
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mb-8 flex items-center justify-center">
          <Button variant="outline" className="gap-2" onClick={() => navigate(backUrl)}>
            <ArrowLeft className="h-4 w-4" />
            {t("userPractice.returnToTheTrainingRoute")}
          </Button>
        </div>

        {/* Question Results */}
        <Card>
          <CardHeader>
            <CardTitle>{t("userPractice.answerDetails")}</CardTitle>
            <CardDescription>{t("userPractice.reviewYourAnswers")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quizItems.map((item, index) => {
                const isCorrect = item.userResponse === item.correctAnswer;
                return (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                      )}
                      <div className="flex-1">
                        <p className="text-foreground font-medium">
                          {t("common.sentence")} {index + 1}: {item.question}
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">
                              {t("userPractice.yourAnswer")}{" "}
                            </span>
                            <Badge
                              variant={isCorrect ? "default" : "destructive"}
                              className="text-xs">
                              {item.userResponse || t("userPractice.noReplyYet")}
                            </Badge>
                          </p>
                          {!isCorrect && (
                            <p>
                              <span className="text-muted-foreground">
                                {t("userPractice.correctAnswer")}{" "}
                              </span>
                              <Badge className="bg-green-100 text-xs text-green-700 hover:bg-green-100">
                                {item.correctAnswer}
                              </Badge>
                            </p>
                          )}
                          {item.explanation && (
                            <div className="mt-2 rounded-md bg-[#F0F8FF] p-3">
                              <p className="text-sm font-medium text-[#0047AB]">
                                {t("userPractice.explain")}
                              </p>
                              <p className="text-muted-foreground text-sm">{item.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
