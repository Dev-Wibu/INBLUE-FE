import { fetchClient } from "@/lib/api";
import { getNormalizedErrorMessage } from "@/lib/error-normalizer";
import type { components } from "../../schema-from-be";

export type EmailSubmissionStatus = "PENDING" | "PROCESSED" | "ERROR" | "IGNORED";

export type EmailSubmissionRecord = components["schemas"]["EmailSubmission"] & {
  status?: EmailSubmissionStatus;
};

function errorMessage(error: unknown): string {
  return getNormalizedErrorMessage(error, "Không thể thực hiện thao tác email");
}

export const emailSubmissionManager = {
  async list(): Promise<EmailSubmissionRecord[]> {
    try {
      const response = await fetchClient.GET("/api/email-submissions");
      return Array.isArray(response.data) ? (response.data as EmailSubmissionRecord[]) : [];
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  },

  async fetchMailbox(): Promise<string> {
    try {
      const response = await fetchClient.POST("/api/email-submissions/fetch");
      return typeof response.data === "string" ? response.data : "Đã yêu cầu quét hộp thư.";
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  },

  async processPending(): Promise<string> {
    try {
      const response = await fetchClient.POST("/api/email-submissions/process-pending");
      return typeof response.data === "string" ? response.data : "Đã yêu cầu xử lý hàng đợi email.";
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  },
};
