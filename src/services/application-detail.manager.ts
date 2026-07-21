import type { ApiResponse } from "@/interfaces";
import { fetchClient } from "@/lib/api";
import type { SubmissionData } from "@/lib/application-detail-utils";
import i18n from "@/lib/i18n";
import type { components } from "../../schema-from-be";

const t = i18n.t.bind(i18n);

export type SubmissionResult = components["schemas"]["SubmissionResult"];
export type ApplicationDetail = components["schemas"]["ApplicationDetail"];

export interface SubmitApplicationDetailParams {
  applicationId: number;
  textContent?: string;
  file?: File;
  quizAnswers?: string[];
  /**
   * One CompileRequest per problem. Per 2026-07-18 BE controller
   * behaviour the whole array is JSON-encoded into a SINGLE multipart
   * field named `compileRequest` (the controller does NOT expose the
   * indexed getter that Spring multipart binding requires for
   * `compileRequest[0]` shape, so indexed fields throw
   * `Illegal attempt to get property 'compileRequest'`).
   */
  compileRequest?: components["schemas"]["CompileRequest"][];
}

export interface HrScoreParams {
  applicationDetailId: number;
  isPass: boolean;
  note: string;
  score: number;
}

export interface CodeReviewSubmission {
  filename: string;
  lineNumber: number;
  severity: string;
  description: string;
}

export interface CodeReviewEvaluateParams {
  applicationId: number;
  roundId: number;
  submissions: CodeReviewSubmission[];
}

export class ApplicationDetailManager {
  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === "object" && "response" in error) {
      return (
        // @ts-expect-error: Backend Swagger schema mismatch
        error.response?.data?.message ||
        // @ts-expect-error: Backend Swagger schema mismatch
        error.message ||
        t("common.anErrorHasOccurred")
      );
    }
    if (error instanceof Error) {
      return error.message;
    }
    return t("general.anUnknownErrorHasOccurred");
  }

  /**
   * Submit application detail (CV screening, quiz answers, email, coding, etc.)
   * POST /api/application-details/submit (multipart/form-data)
   */
  async submit(params: SubmitApplicationDetailParams): Promise<ApiResponse<SubmissionResult>> {
    try {
      const formData = new FormData();
      formData.append("applicationId", String(params.applicationId));
      if (params.textContent) {
        formData.append("textContent", params.textContent);
      }
      if (params.file) {
        formData.append("file", params.file);
      }
      if (params.quizAnswers && params.quizAnswers.length > 0) {
        params.quizAnswers.forEach((ans) => formData.append("quizAnswers", ans));
      }
      if (params.compileRequest && params.compileRequest.length > 0) {
        // 2026-07-18: BE tried three different multipart shapes and only
        // the single JSON-encoded array works against the current
        // controller. Sending `compileRequest[0]` / `compileRequest[1]`
        // throws `Illegal attempt to get property 'compileRequest'` on
        // the BE side (see #compile-error-500). Sending nested
        // `compileRequest[0].problemId` fields fails because Spring's
        // multipart binding requires the DTO to expose indexed getters
        // (`getCompileRequest(int)`) which the controller does not. So
        // we send the canonical JSON-encoded array in a single field.
        formData.append("compileRequest", JSON.stringify(params.compileRequest));
      }

      const response = await fetchClient
        .POST("/api/application-details/submit", {
          headers: {
            "Content-Type": undefined,
          },
          body: formData as unknown as Record<string, unknown>,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));

      return {
        success: true,
        data: response.data as SubmissionResult,
      };
    } catch (error) {
      console.error("[ApplicationDetailManager] submit error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * HR/Admin scores and approves/rejects a candidate's application round
   * POST /api/application-details/hr-score?applicationDetailId=&isPass=&note=&score=
   */
  async hrScore(params: HrScoreParams): Promise<ApiResponse<ApplicationDetail>> {
    try {
      const response = await fetchClient.POST("/api/application-details/hr-score", {
        params: {
          query: {
            applicationDetailId: params.applicationDetailId,
            isPass: params.isPass,
            note: params.note,
            score: params.score,
          },
        },
      });
      return {
        success: true,
        data: response.data as ApplicationDetail,
      };
    } catch (error) {
      // Handle empty JSON body (BE returns 200 with no body)
      if (
        error instanceof SyntaxError ||
        (error instanceof Error && error.message.includes("JSON"))
      ) {
        return {
          success: true,
          data: undefined as unknown as ApplicationDetail,
        };
      }
      console.error("[ApplicationDetailManager] hrScore error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Get all application details (all rounds) for a specific application
   * GET /api/application-details/application/{applicationId}
   *
   * Defensive unwrap: BE currently returns a bare array, but if it ever
   * switches to a `{ data: [...] }` wrapper the page would silently go
   * empty — handle both shapes here so the UI never breaks.
   */
  async getByApplicationId(applicationId: number): Promise<ApiResponse<ApplicationDetail[]>> {
    try {
      const response = await fetchClient.GET(
        "/api/application-details/application/{applicationId}",
        {
          params: { path: { applicationId } },
        }
      );
      const raw = response.data as unknown;
      const list = Array.isArray(raw) ? (raw as ApplicationDetail[]) : unwrapReviewerPayload(raw);
      return {
        success: true,
        data: list,
      };
    } catch (error) {
      console.error("[ApplicationDetailManager] getByApplicationId error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Get a single application detail by ID
   * GET /api/application-details/{id}
   */
  async getById(id: number): Promise<ApiResponse<ApplicationDetail | null>> {
    try {
      const response = await fetchClient.GET("/api/application-details/{id}", {
        params: { path: { id } },
      });
      return {
        success: true,
        data: response.data as ApplicationDetail,
      };
    } catch (error) {
      console.error("[ApplicationDetailManager] getById error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Submit Code Review evaluation
   * POST /api/application-details/code-review/evaluate
   */
  async submitCodeReview(params: CodeReviewEvaluateParams): Promise<ApiResponse<SubmissionResult>> {
    try {
      const response = await fetchClient.POST("/api/application-details/code-review/evaluate", {
        body: {
          applicationId: params.applicationId,
          roundId: params.roundId,
          submissions: params.submissions.map((s) => ({
            filename: s.filename,
            lineNumber: s.lineNumber,
            severity: s.severity,
            description: s.description,
          })),
        } as never,
      });
      return {
        success: true,
        data: response.data as SubmissionResult,
      };
    } catch (error) {
      console.error("[ApplicationDetailManager] submitCodeReview error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Get all application details assigned to current reviewer (Staff)
   * GET /api/application-details/reviewer
   *
   * The BE response is wrapped as `{ data: ApplicationDetail[], traceId?: string }`,
   * not a bare array, so we unwrap it here.
   */
  async getForReviewer(): Promise<ApiResponse<ApplicationDetail[]>> {
    try {
      const response = await fetchClient.GET("/api/application-details/reviewer", {});
      const raw = response.data as unknown;
      const list = unwrapReviewerPayload(raw);
      return {
        success: true,
        data: list,
      };
    } catch (error) {
      console.error("[ApplicationDetailManager] getForReviewer error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Get ALL application details from ALL applications that need HR scoring.
   * This is a workaround because endpoint /reviewer only returns details
   * with assigned reviewers, but CV rounds don't have reviewers (auto AI).
   *
   * 1. Fetch all applications
   * 2. Fetch details for each application
   * 3. Filter to only AI_EVALUATED + no hrScore (needs HR review)
   */
  async getAllPendingHRReviews(): Promise<ApiResponse<ApplicationDetail[]>> {
    try {
      // Step 1: Get all applications
      const appsResponse = await fetchClient.GET("/api/applications", {});
      const appsRaw = appsResponse.data as unknown;
      const applications = unwrapApplicationPayload(appsRaw);

      if (applications.length === 0) {
        return { success: true, data: [] };
      }

      // Step 2: Get details for each application
      const detailPromises = applications.map((app: { id?: number }) =>
        this.getByApplicationId(app.id!).then((r) => r.data ?? [])
      );

      const allDetailArrays = await Promise.all(detailPromises);
      const allDetails = allDetailArrays.flat();

      // Step 3: Filter to pending HR reviews
      const pendingHR = allDetails.filter(
        (detail) =>
          detail.status === "AI_EVALUATED" &&
          (detail.hrScore === undefined || detail.hrScore === null) &&
          !isAutoGradedType(detail)
      );

      return {
        success: true,
        data: pendingHR,
      };
    } catch (error) {
      console.error("[ApplicationDetailManager] getAllPendingHRReviews error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  /**
   * Admin assigns a mentor to a candidate's Mentor Review round
   * PUT /api/application-details/{id}/assign-mentor?mentorId=
   */
  async assignMentor(
    applicationDetailId: number,
    mentorId: number
  ): Promise<ApiResponse<ApplicationDetail>> {
    try {
      const response = await fetchClient.PUT("/api/application-details/{id}/assign-mentor", {
        params: {
          path: { id: applicationDetailId },
          query: { mentorId },
        },
      });
      return {
        success: true,
        data: response.data as ApplicationDetail,
      };
    } catch (error) {
      console.error("[ApplicationDetailManager] assignMentor error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }
}

/**
 * Unwrap the BE reviewer payload into a flat ApplicationDetail[].
 *
 * The BE returns either:
 *   - `{ data: ApplicationDetail[], traceId?: string }` (current behaviour)
 *   - a bare `ApplicationDetail[]`
 *   - `null` / `undefined` (no items)
 *
 * Anything that doesn't look like an array falls through to `[]` so the
 * UI shows the empty-state instead of crashing.
 */
function unwrapReviewerPayload(raw: unknown): ApplicationDetail[] {
  if (Array.isArray(raw)) return raw as ApplicationDetail[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const candidate = obj["data"] ?? obj["items"] ?? obj["content"] ?? obj["results"];
    if (Array.isArray(candidate)) return candidate as ApplicationDetail[];
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      const inner = nested["data"] ?? nested["items"] ?? nested["content"];
      if (Array.isArray(inner)) return inner as ApplicationDetail[];
    }
  }
  return [];
}

/**
 * Unwrap the BE applications payload into a flat array.
 */
function unwrapApplicationPayload(raw: unknown): { id?: number }[] {
  if (Array.isArray(raw)) return raw as { id?: number }[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const candidate = obj["data"] ?? obj["items"] ?? obj["content"] ?? obj["results"];
    if (Array.isArray(candidate)) return candidate as { id?: number }[];
  }
  return [];
}

/**
 * Check if an ApplicationDetail is auto-graded (QUIZ, CODE_REVIEW, EMAIL_SIMULATOR).
 * CV_SCREENING is NOT auto-graded - it needs human HR review.
 */
function isAutoGradedType(detail: ApplicationDetail): boolean {
  const data = detail.submissionData as SubmissionData | undefined;
  if (!data) return false;

  // Check submission type
  if (data.quizAnswers && data.quizAnswers.length > 0) return true;
  if (data.codeReviewSubmissions && data.codeReviewSubmissions.length > 0) return true;
  if (data.codeSubmissions && data.codeSubmissions.length > 0) return false; // CODING needs HR

  // Check for email content
  if (data.textContent) {
    if (
      data.textContent.includes("To:") ||
      data.textContent.includes("Subject:") ||
      data.textContent.includes("Dear") ||
      data.textContent.includes("Kính gửi")
    ) {
      return true; // EMAIL_SIMULATOR
    }
  }

  return false;
}

export const applicationDetailManager = new ApplicationDetailManager();
