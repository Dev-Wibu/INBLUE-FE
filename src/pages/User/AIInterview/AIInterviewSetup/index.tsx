import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Briefcase, CheckCircle2, Settings, Sparkles, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CandidateProfileStep } from "./CandidateProfileStep";
import { ConfigStep } from "./ConfigStep";
import { JobRequirementsStep } from "./JobRequirementsStep";
import { StepIndicator } from "./StepIndicator";
import { useAIInterviewSetup } from "./useAIInterviewSetup";
export function AIInterviewSetupPage() {
  const { t } = useTranslation();
  const hook = useAIInterviewSetup();
  const {
    currentStep,
    handleNext,
    handleBack,
    canProceed,
    isCreatingSession,
    selectedMode,
    selectedDifficulty,
    selectedLanguage,
    selectedDomain,
    selectedDuration,
    isStep1Complete,
    isStep2Complete,
    isStep3Complete,
    getSelectedLabel,
  } = hook;
  return (
    <div className="bg-background min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-foreground text-2xl font-bold">
            {t("userAiinterview.setUpANewInterview")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("userAiinterview.completeThe3StepsTo")}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <StepIndicator currentStep={currentStep} />
      </div>

      <div className="flex gap-6">
        {/* Left Column - Step Content */}
        <div className="flex flex-1 flex-col gap-6">
          {currentStep === 1 && <ConfigStep hook={hook} />}
          {currentStep === 2 && <CandidateProfileStep hook={hook} />}
          {currentStep === 3 && <JobRequirementsStep hook={hook} />}
        </div>

        {/* Right Column - Summary */}
        <div className="w-96 shrink-0">
          <Card className="sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{t("userAiinterview.setupSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Step 1 summary */}
              <div className="space-y-2">
                <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  {isStep1Complete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Settings className="text-muted-foreground h-4 w-4" />
                  )}
                  {t("userAiinterview.step1Configuration")}
                </div>
                <div className="space-y-1.5 pl-6">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      {t("userAiinterview.regime")}
                    </span>
                    <Badge
                      variant={selectedMode ? "default" : "secondary"}
                      className="max-w-50 truncate text-xs">
                      {getSelectedLabel("interview_modes", selectedMode)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      {t("userAiinterview.difficultyLevel")}
                    </span>
                    <Badge
                      variant={selectedDifficulty ? "default" : "secondary"}
                      className="max-w-40 truncate text-xs">
                      {getSelectedLabel("difficulties", selectedDifficulty)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">{t("common.language")}</span>
                    <Badge
                      variant={selectedLanguage ? "default" : "secondary"}
                      className="max-w-40 truncate text-xs">
                      {getSelectedLabel("languages", selectedLanguage)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      {t("userAiinterview.field")}
                    </span>
                    <Badge
                      variant={selectedDomain ? "default" : "secondary"}
                      className="max-w-40 truncate text-xs">
                      {getSelectedLabel("domains", selectedDomain)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">{t("common.duration")}</span>
                    <Badge variant="default" className="max-w-40 truncate text-xs">
                      {selectedDuration} {t("common.minute")}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="border-border border-t" />

              {/* Step 2 summary */}
              <div className="space-y-2">
                <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  {isStep2Complete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <User className="text-muted-foreground h-4 w-4" />
                  )}
                  {t("userAiinterview.step2CandidateProfile")}
                </div>
                <div className="pl-6">
                  {isStep2Complete ? (
                    <Badge variant="default" className="text-xs">
                      {t("userAiinterview.profileSaved")}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {t("userAiinterview.unfinished")}
                    </span>
                  )}
                </div>
              </div>

              <div className="border-border border-t" />

              {/* Step 3 summary */}
              <div className="space-y-2">
                <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  {isStep3Complete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Briefcase className="text-muted-foreground h-4 w-4" />
                  )}
                  {t("userAiinterview.step3JobRequest")}
                </div>
                <div className="pl-6">
                  {isStep3Complete ? (
                    <Badge variant="default" className="text-xs">
                      {t("userAiinterview.requestCreated")}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {t("userAiinterview.unfinished")}
                    </span>
                  )}
                </div>
              </div>

              <div className="border-border border-t" />

              {/* Navigation buttons */}
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button variant="outline" className="flex-1" onClick={handleBack}>
                    {t("general.back")}
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canProceed || isCreatingSession}
                  className="flex-1 bg-[#0047AB] text-white hover:bg-[#005B9A] disabled:bg-slate-300"
                  size="lg">
                  {isCreatingSession ? (
                    <>
                      <Spinner size="sm" tone="white" className="mr-2" />
                      {t("common.creating")}
                    </>
                  ) : currentStep === 3 ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t("userAiinterview.startInterviewing")}
                    </>
                  ) : (
                    t("common.next")
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
