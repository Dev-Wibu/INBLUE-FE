import type { InterviewSessionRedis } from "@/interfaces";
import type { ChatMessage, InterviewStartResponse } from "@/services/kiosk/kioskApi.service";

function messageTime(value?: string): string {
  const match = value?.match(/[T ](\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "--:--";
}

function sameMessage(first: string, second: string): boolean {
  return (
    first.trim().replace(/\s+/g, " ").toLowerCase() ===
    second.trim().replace(/\s+/g, " ").toLowerCase()
  );
}

export function buildKioskResumeMessages(
  cache: InterviewSessionRedis | undefined,
  current: InterviewStartResponse | undefined
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let nextId = 1;

  for (const exchange of cache?.chatHistory ?? []) {
    const timestamp = messageTime(exchange.submittedAt);
    if (exchange.questionText?.trim()) {
      messages.push({
        id: nextId++,
        role: "ai",
        content: exchange.questionText,
        timestamp,
        meta: {
          phaseName: exchange.phaseName,
          questionIndex: exchange.questionOrder,
          questionType: exchange.type,
        },
      });
    }
    if (exchange.answerText?.trim()) {
      messages.push({
        id: nextId++,
        role: "user",
        content: exchange.answerText,
        timestamp,
      });
    }
  }

  const currentQuestion = current?.questionContent ?? cache?.currentQuestionText;
  if (
    currentQuestion?.trim() &&
    !messages.some(
      (message) => message.role === "ai" && sameMessage(message.content, currentQuestion)
    )
  ) {
    messages.push({
      id: nextId,
      role: "ai",
      content: currentQuestion,
      timestamp: "--:--",
      meta: {
        phaseName: current?.phaseName,
        questionIndex: current?.currentQuestionIndex ?? cache?.currentQuestionIndex,
        totalQuestions: current?.totalQuestionsInPhase,
        questionType: current?.questionType ?? cache?.currentQuestionType,
      },
    });
  }

  return messages;
}
