import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { DeviceCheckDialog } from "@/components/video-call";
import { AlertCircle, ArrowLeft, Settings } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatPanel } from "./ChatPanel";
import { InterviewHeader } from "./InterviewHeader";
import { InterviewStage } from "./InterviewStage";
import { useAIInterviewSession } from "./useAIInterviewSession";
import { useUserCameraPreview } from "./useUserCameraPreview";
export function AIInterviewSessionPage() {
  const { t } = useTranslation();
  const [isDeviceCheckOpen, setIsDeviceCheckOpen] = useState(true);
  const [hasConfirmedDevices, setHasConfirmedDevices] = useState(false);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null);
  const session = useAIInterviewSession(hasConfirmedDevices);
  const cameraPreview = useUserCameraPreview(hasConfirmedDevices, selectedVideoDeviceId);

  // ---- Error state: missing session key ----
  if (!session.sessionKey) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common.noInterviewSessionsFound")}</AlertTitle>
          <AlertDescription>{t("userAiinterview.missingSessionKeyPleaseCreate")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // ---- Error state: start failed ----
  if (session.startError) {
    const errorBody =
      (
        session.startError as {
          message?: string;
        }
      )?.message ?? JSON.stringify(session.startError).slice(0, 200);
    const isExpired =
      errorBody.includes("not found") || errorBody.includes("expired") || errorBody.includes("404");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isExpired
              ? t("userAiinterview.interviewSessionDoesNotExist")
              : t("userAiinterview.errorStartingInterview")}
          </AlertTitle>
          <AlertDescription className="space-y-1">
            <p>
              {isExpired
                ? t("userAiinterview.theInterviewSessionHasExpired")
                : t("userAiinterview.unableToStartInterviewSession")}
            </p>
            {import.meta.env.DEV && errorBody && (
              <p className="text-xs break-all opacity-70">
                {t("userAiinterview.detail")} {errorBody}
              </p>
            )}
          </AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => session.navigate("/user?tab=aiInterview")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.backToTheList")}
          </Button>
          <Button
            onClick={() => session.navigate("/user/ai-interview/setup")}
            className="bg-[#0047AB] text-white hover:bg-[#005B9A]">
            {t("userAiinterview.createNewInterview")}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Loading state ----
  if (session.isStarting && session.messages.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Spinner size="xl" />
          <p className="text-muted-foreground font-medium">
            {t("userAiinterview.startingInterviews")}
          </p>
        </div>
      </div>
    );
  }

  // ---- Main chat UI ----
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-slate-950">
      <InterviewHeader
        phaseName={session.currentPhase}
        questionIndex={session.currentQuestionIndex}
        totalQuestions={session.totalQuestions}
        finished={session.interviewFinished}
        isTTSSupported={session.isTTSSupported}
        isMuted={session.isMuted}
        speechLanguage={session.speechLanguage}
        speechLanguageLabel={session.speechLanguageLabel}
        activeVoiceName={session.activeVoiceName}
        shouldWarnSpeechFallback={session.shouldWarnSpeechFallback}
        canSwitchSpeechLanguage={session.canSwitchSpeechLanguage}
        onSpeechLanguageChange={session.handleSpeechLanguageChange}
        onToggleMute={session.toggleMute}
        onBack={session.handleNavigateBack}
      />
      <DeviceCheckDialog
        isOpen={isDeviceCheckOpen}
        onOpenChange={setIsDeviceCheckOpen}
        showDisplayName={false}
        onConfirm={(selection) => {
          setIsDeviceCheckOpen(false);
          setHasConfirmedDevices(true);
          setSelectedVideoDeviceId(selection.videoDeviceId);
          session.handleDeviceCheckConfirmed();
        }}
      />

      {!hasConfirmedDevices ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <Settings className="h-12 w-12 text-cyan-200" />
          <p className="text-center text-lg font-semibold text-slate-100">
            {t("userAiinterview.pleaseCheckYourEquipmentBefore")}
          </p>
          <Button
            onClick={() => setIsDeviceCheckOpen(true)}
            className="bg-cyan-600 text-white hover:bg-cyan-700">
            {t("userAiinterview.openDeviceCheck")}
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <InterviewStage
            phaseName={session.currentPhase}
            questionIndex={session.currentQuestionIndex}
            totalQuestions={session.totalQuestions}
            interviewFinished={session.interviewFinished}
            sessionExpiredMidway={session.sessionExpiredMidway}
            isListening={session.isListening}
            isSpeechSupported={session.isSpeechRecognitionSupported}
            canUseSpeechInput={session.canUseSpeechInput}
            speechLanguageLabel={session.speechLanguageLabel}
            isSubmitting={session.isSubmitting}
            isEvaluating={session.isEvaluating}
            cameraState={cameraPreview.state}
            cameraMessage={cameraPreview.message}
            cameraVideoRef={cameraPreview.videoRef}
            onToggleListening={session.handleToggleListening}
            onToggleCamera={cameraPreview.toggleCamera}
          />

          <div className="h-[52vh] min-h-0 md:h-auto md:w-[430px] lg:w-[470px]">
            <ChatPanel
              messages={session.messages}
              userAvatarUrl={session.user?.avatarUrl ?? undefined}
              isTTSSupported={session.isTTSSupported}
              onToggleSpeak={session.handleToggleSpeak}
              speakingId={session.speakingId}
              isEvaluating={session.isEvaluating}
              isSubmitting={session.isSubmitting}
              hasStarted={session.hasStarted}
              messagesEndRef={session.messagesEndRef}
              interviewFinished={session.interviewFinished}
              sessionExpiredMidway={session.sessionExpiredMidway}
              onNavigateToList={session.handleNavigateBack}
              onNavigateToSetup={() => session.navigate("/user/ai-interview/setup")}
              onViewResults={session.handleViewResults}
              onSendAnswer={session.handleSendFromComposer}
              isListening={session.isListening}
              interimTranscript={session.interimTranscript}
              speechLanguageLabel={session.speechLanguageLabel}
              chatInputValue={session.chatInputValue}
              onChatInputChange={session.setChatInputValue}
            />
          </div>
        </div>
      )}
    </div>
  );
}
