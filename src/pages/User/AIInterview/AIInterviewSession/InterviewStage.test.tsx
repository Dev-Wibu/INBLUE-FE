import i18n from "@/lib/i18n";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { InterviewStage } from "./InterviewStage";
const t = i18n.t.bind(i18n);
describe("InterviewStage", () => {
  it(t("userAiinterview.alwaysMountAVideoCard"), () => {
    const { container } = render(
      <InterviewStage
        phaseName={t("userAiinterview.hello")}
        questionIndex={1}
        totalQuestions={3}
        interviewFinished={false}
        sessionExpiredMidway={false}
        isListening={false}
        isSpeechSupported={true}
        canUseSpeechInput={true}
        speechLanguageLabel={t("common.vietnamese")}
        isSubmitting={false}
        isEvaluating={false}
        cameraState="requesting"
        cameraMessage={null}
        cameraVideoRef={createRef<HTMLVideoElement>()}
        onToggleListening={vi.fn()}
        onToggleCamera={vi.fn()}
      />
    );
    expect(container.querySelector("video")).toBeInTheDocument();
    expect(screen.getByText(t("userAiinterview.askingForCameraPermission"))).toBeInTheDocument();
  });
  it(t("userAiinterview.collapseThePanelWhenThe"), () => {
    const { getByTestId } = render(
      <InterviewStage
        phaseName={t("userAiinterview.hello")}
        questionIndex={1}
        totalQuestions={3}
        interviewFinished={false}
        sessionExpiredMidway={false}
        isListening={false}
        isSpeechSupported={true}
        canUseSpeechInput={true}
        speechLanguageLabel={t("common.vietnamese")}
        isSubmitting={false}
        isEvaluating={false}
        cameraState="idle"
        cameraMessage={null}
        cameraVideoRef={createRef<HTMLVideoElement>()}
        onToggleListening={vi.fn()}
        onToggleCamera={vi.fn()}
      />
    );
    expect(getByTestId("camera-panel")).toHaveStyle({
      height: "100px",
    });
    expect(screen.getByText(t("userAiinterview.cameraIsOff"))).toBeInTheDocument();
  });
  it(t("userAiinterview.showTheHandleToResize"), () => {
    render(
      <InterviewStage
        phaseName={t("userAiinterview.hello")}
        questionIndex={1}
        totalQuestions={3}
        interviewFinished={false}
        sessionExpiredMidway={false}
        isListening={false}
        isSpeechSupported={true}
        canUseSpeechInput={true}
        speechLanguageLabel={t("common.vietnamese")}
        isSubmitting={false}
        isEvaluating={false}
        cameraState="granted"
        cameraMessage={null}
        cameraVideoRef={createRef<HTMLVideoElement>()}
        onToggleListening={vi.fn()}
        onToggleCamera={vi.fn()}
      />
    );
    expect(screen.getByLabelText(t("userAiinterview.dragToResizeTheCamera"))).toBeInTheDocument();
  });
});
