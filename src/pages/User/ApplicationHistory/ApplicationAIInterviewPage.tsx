import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useApplicationDetails } from "@/hooks/useApplicationDetails";
import { useCurrentRound } from "@/hooks/useRound";
import { $api, fetchClient } from "@/lib/api";
import type { InterviewStartResponse } from "@/services/kiosk/kioskApi.service";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const StandaloneKioskPage = lazy(() =>
  import("@/pages/KioskApp").then((module) => ({ default: module.StandaloneKioskPage }))
);

export function ApplicationAIInterviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const applicationId = Number(params.applicationId);
  const requestedApplicationDetailId = Number(searchParams.get("applicationDetailId")) || 0;
  const resumeSessionKey = searchParams.get("sessionKey")?.trim() ?? "";
  const resumeState = location.state as {
    resumedQuestion?: InterviewStartResponse;
    resumeDurationMinutes?: number;
  } | null;
  const isResume = Boolean(resumeSessionKey);

  // Fetch current round config for instruction + time limit
  const { data: currentRound, isLoading: roundLoading } = useCurrentRound(
    applicationId,
    !!applicationId
  );
  const roundConfig = currentRound?.configData as
    | { instruction?: string; timeLimitMinutes?: number }
    | undefined;

  const { data: applicationDetails = [], isLoading: detailsLoading } = useApplicationDetails(
    applicationId,
    !!applicationId && requestedApplicationDetailId === 0
  );
  const { data: candidateProfile, isLoading: profileLoading } = $api.useQuery(
    "get",
    "/api/candidate-profiles/application/{applicationId}",
    { params: { path: { applicationId } } },
    { enabled: applicationId > 0 && !isResume }
  );
  const { data: resumeCache, isLoading: resumeCacheLoading } = $api.useQuery(
    "get",
    "/api/interview-sessions/cache/{sessionKey}",
    { params: { path: { sessionKey: resumeSessionKey } } },
    { enabled: isResume }
  );
  const applicationDetailId = useMemo(() => {
    if (requestedApplicationDetailId > 0) return requestedApplicationDetailId;

    const matchingDetail =
      applicationDetails.find((item) => currentRound?.id && item.roundId === currentRound.id) ??
      applicationDetails.find((item) => item.roundType === "AI_INTERVIEW");
    return matchingDetail?.id ?? 0;
  }, [applicationDetails, currentRound?.id, requestedApplicationDetailId]);

  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionKey, setSessionKey] = useState(resumeSessionKey);
  const createAttemptedRef = useRef(false);

  useEffect(() => {
    if (
      !applicationId ||
      isResume ||
      !user?.id ||
      !applicationDetailId ||
      roundLoading ||
      detailsLoading ||
      profileLoading ||
      isCreatingSession ||
      createAttemptedRef.current
    )
      return;
    createAttemptedRef.current = true;
    setIsCreatingSession(true);

    void (async () => {
      try {
        const body = {
          user_id: user.id,
          application_detail_id: applicationDetailId,
          candidate_profile: candidateProfile ?? {
            applicationId,
            technicalSkills: [],
            softSkills: [],
            tools: [],
            projects: [],
            workExperiences: [],
            educations: [],
            certifications: [],
            achievements: [],
          },
          job_requirement: {
            basic_info: {
              job_title: "Application Interview",
              industry_domain: "IT",
              seniority_level: "Senior",
            },
            competencies: {
              hard_skills: [],
              soft_skills: [],
              tools_and_platforms: [],
            },
            responsibilities: [roundConfig?.instruction ?? ""],
          },
          session_config: {
            duration_minutes: roundConfig?.timeLimitMinutes ?? 30,
            interview_mode: "STANDARD_MOCK",
            difficulty: "FRESHER_ADVANCED",
            language: "VI",
            domain: "IT",
          },
        };

        const { data, error } = await fetchClient.POST("/api/interview-sessions/create-session", {
          body: body as never,
          parseAs: "text",
        });
        if (error || !data) {
          throw new Error(t("userAiinterview.unableToCreateInterviewSession"));
        }
        const rawKey = String(data).trim().replace(/^"|"$/g, "");

        let key = "";
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawKey)) {
          key = rawKey;
        } else {
          throw new Error("Invalid session key: " + rawKey.slice(0, 50));
        }

        setSessionKey(key);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("userAiinterview.unableToCreateInterviewSession")
        );
        navigate(`/user/application/${applicationId}`, { replace: true });
      } finally {
        setIsCreatingSession(false);
      }
    })();
  }, [
    applicationDetailId,
    applicationId,
    candidateProfile,
    detailsLoading,
    isCreatingSession,
    isResume,
    navigate,
    profileLoading,
    roundConfig,
    roundLoading,
    t,
    user,
  ]);

  useEffect(() => {
    if (!sessionKey || !applicationDetailId) return;
    const serializedSession = JSON.stringify({
      sessionKey,
      applicationId,
      applicationDetailId,
      durationMinutes: resumeState?.resumeDurationMinutes ?? roundConfig?.timeLimitMinutes ?? 30,
    });
    localStorage.setItem(`application-ai-interview:${applicationDetailId}`, serializedSession);
    localStorage.setItem(`application-ai-interview-app:${applicationId}`, serializedSession);
  }, [
    applicationDetailId,
    applicationId,
    resumeState?.resumeDurationMinutes,
    roundConfig?.timeLimitMinutes,
    sessionKey,
  ]);

  const handleBack = useCallback(() => {
    navigate(`/user/application/${applicationId}`);
  }, [applicationId, navigate]);

  if (!applicationId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">{t("common.invalidId")}</p>
      </div>
    );
  }

  if (sessionKey) {
    if (isResume && resumeCacheLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <Spinner size="lg" tone="white" />
        </div>
      );
    }
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-950">
            <Spinner size="lg" tone="white" />
          </div>
        }>
        <StandaloneKioskPage
          initialSessionKey={sessionKey}
          initialDurationMinutes={
            resumeState?.resumeDurationMinutes ?? roundConfig?.timeLimitMinutes ?? 30
          }
          initialStartResponse={resumeState?.resumedQuestion}
          initialSessionCache={resumeCache}
          experienceMode="web"
          onExit={handleBack}
          onInterviewFinished={() => {
            localStorage.removeItem(`application-ai-interview:${applicationDetailId}`);
            localStorage.removeItem(`application-ai-interview-app:${applicationId}`);
          }}
        />
      </Suspense>
    );
  }

  const isLoading = roundLoading || detailsLoading || profileLoading || isCreatingSession;

  if (!isLoading && !applicationDetailId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center dark:bg-slate-950">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <div className="max-w-md">
          <h1 className="text-lg font-bold text-slate-950 dark:text-white">
            {t("userApplication.aiInterview.webInterviewUnavailable", "Interview is not ready")}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t(
              "userApplication.aiInterview.webInterviewUnavailableDescription",
              "The AI interview round could not be found for this application. Please return and refresh the application."
            )}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-6 sm:px-6 md:px-8 dark:bg-slate-950">
      <header className="mx-auto max-w-5xl rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleBack}
              disabled={isCreatingSession}
              title={t("general.back")}
              aria-label={t("general.back")}
              className="h-10 w-10 shrink-0 rounded-xl border-slate-200 dark:border-slate-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("userApplicationhistory.aiInterviewRound")}
              </h1>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                {roundConfig?.instruction ?? "AI Interview"}
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Đang chuẩn bị
          </span>
        </div>
      </header>

      <main className="mx-auto mt-6 grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
            {roundLoading
              ? t("userAiinterview.preparingYourInterview")
              : t("userApplicationhistory.redirectingToInterview")}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Hệ thống đang tạo phiên riêng và tải cấu hình giọng nói. Trang chọn giọng sẽ mở ngay khi
            hoàn tất.
          </p>
        </section>
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Thông tin vòng phỏng vấn
          </h2>
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4" />
                Thời lượng
              </span>
              <span className="text-sm font-semibold">
                {roundConfig?.timeLimitMinutes ?? 30} {t("common.minute")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-4 w-4" />
                Phiên riêng tư
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Bot className="h-4 w-4" />
                Hình thức
              </span>
              <span className="text-sm font-semibold">Voice và văn bản</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
