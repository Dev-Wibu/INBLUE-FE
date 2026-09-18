import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useApplicationDetails } from "@/hooks/useApplicationDetails";
import { useCurrentRound } from "@/hooks/useRound";
import { $api, fetchClient } from "@/lib/api";
import type { InterviewStartResponse } from "@/services/kiosk/kioskApi.service";
import { useAuthStore } from "@/stores/authStore";
import { AlertCircle, ArrowLeft, Bot, Clock } from "lucide-react";
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 dark:bg-slate-950">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="shrink-0"
          disabled={isCreatingSession}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0047AB] shadow-lg">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t("userApplicationhistory.aiInterviewRound")}
            </h1>
            <p className="text-sm text-slate-500">{roundConfig?.instruction ?? "AI Interview"}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {isLoading ? (
          <>
            <Spinner size="lg" tone="primary" />
            <p className="text-sm text-slate-500">
              {roundLoading
                ? t("userAiinterview.preparingYourInterview")
                : t("userApplicationhistory.redirectingToInterview")}
            </p>
          </>
        ) : (
          <>
            <Clock className="h-12 w-12 animate-pulse text-[#0047AB]" />
            <p className="text-sm text-slate-500">
              {t("userApplicationhistory.redirectingToInterview")}
            </p>
          </>
        )}
      </div>

      {roundConfig && (
        <div className="w-full max-w-md space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {roundConfig.instruction && (
            <p className="text-xs text-slate-600 dark:text-slate-400">{roundConfig.instruction}</p>
          )}
          {roundConfig.timeLimitMinutes && (
            <div className="flex items-center gap-1.5 pt-2">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">
                {roundConfig.timeLimitMinutes} {t("common.minute")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
