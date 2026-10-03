import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function ChatPanelHarness() {
  const [value, setValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  return (
    <ChatPanel
      messages={[]}
      isTTSSupported={false}
      onToggleSpeak={() => undefined}
      speakingId={null}
      isEvaluating={false}
      isSubmitting={false}
      hasStarted
      messagesEndRef={messagesEndRef}
      interviewFinished={false}
      sessionExpiredMidway={false}
      onNavigateToList={() => undefined}
      onNavigateToSetup={() => undefined}
      onViewResults={() => undefined}
      onSendAnswer={() => undefined}
      isListening={false}
      interimTranscript=""
      chatInputValue={value}
      onChatInputChange={setValue}
      speechLanguageLabel="Tiếng Việt"
    />
  );
}

describe("AI interview chat composer", () => {
  it("caps long answers and scrolls to the latest text", async () => {
    render(<ChatPanelHarness />);
    const input = screen.getByRole("textbox");
    Object.defineProperty(input, "scrollHeight", { configurable: true, value: 240 });

    fireEvent.change(input, { target: { value: "a".repeat(500) } });

    await waitFor(() => {
      expect(input).toHaveStyle({ height: "120px", overflowY: "auto" });
      expect(input.scrollTop).toBe(240);
    });
  });
});
