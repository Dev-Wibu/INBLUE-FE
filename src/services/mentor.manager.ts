import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Mentor Manager
 * Handles mentor CRUD operations
 * Based on schema-from-be.d.ts API specification
 */

import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import type {
  ApiResponse,
  BaseManager,
  CreateMentorRequest as ContractCreateMentorRequest,
  Mentor,
  MentorProfileRequest,
  PaginatedResponse,
  PaginationParams,
  SchemaUserScheduleEventDto,
} from "@/interfaces";
import { fetchClient } from "@/lib/api";
import type { AppApiError } from "@/lib/error-normalizer";
import { validateMentorData } from "@/lib/mentor-validation";

// Re-export Mentor type for convenience
export type { Mentor } from "@/interfaces";
export type CreateMentorRequest = ContractCreateMentorRequest;
export type UpdateMentorRequest = Omit<CreateMentorRequest, "password"> & {
  profileData: MentorProfileRequest;
};
export type RecommendedMentor = Mentor & { matchPercent?: number | null };
export type MentorScheduleEvent = SchemaUserScheduleEventDto;

/**
 * Extended mentor data for creation with file uploads
 * Files: avatar
 */
export interface CreateMentorData extends CreateMentorRequest {
  avatar?: File;
  active?: boolean;
}

/**
 * Creates an empty file placeholder for multipart/form-data requests
 * Used as workaround for backend null pointer issues with optional file fields
 */
type MentorApiShape = Mentor & { isActive?: boolean };

const normalizeTextList = (values?: string[] | null) =>
  (values ?? []).map((value) => value.trim()).filter(Boolean);

const normalizeProfilePayload = (
  profileData?: Partial<MentorProfileRequest> | null
): MentorProfileRequest => ({
  certifications: normalizeTextList(profileData?.certifications),
  skills: normalizeTextList(profileData?.skills),
  jobTitle: profileData?.jobTitle?.trim() || null,
  education: profileData?.education?.trim() || null,
  languages: normalizeTextList(profileData?.languages),
  portfolioUrl: profileData?.portfolioUrl?.trim() || null,
  githubUrl: profileData?.githubUrl?.trim() || null,
});

function normalizeMentor(mentor: MentorApiShape): Mentor {
  if (!mentor || typeof mentor !== "object") return mentor;
  const normalized =
    typeof mentor.active === "boolean"
      ? mentor
      : typeof mentor.isActive === "boolean"
        ? { ...mentor, active: mentor.isActive }
        : mentor;
  if (!mentor.profileData) return normalized;
  return {
    ...normalized,
    profileData: {
      certifications: mentor.profileData.certifications ?? [],
      skills: mentor.profileData.skills ?? [],
      jobTitle: mentor.profileData.jobTitle ?? null,
      education: mentor.profileData.education ?? null,
      languages: mentor.profileData.languages ?? [],
      portfolioUrl: mentor.profileData.portfolioUrl ?? null,
      githubUrl: mentor.profileData.githubUrl ?? null,
    },
  };
}

function normalizeMentorResponse(
  data: PaginatedResponse<Mentor> | Mentor[]
): PaginatedResponse<Mentor> | Mentor[] {
  if (Array.isArray(data)) return data.map((mentor) => normalizeMentor(mentor));
  const response = data as PaginatedResponse<Mentor> & {
    data?: Mentor[];
    items?: Mentor[];
  };
  if (Array.isArray(response.data)) {
    return { ...response, data: response.data.map((mentor) => normalizeMentor(mentor)) };
  }
  if (Array.isArray(response.items)) {
    return {
      ...response,
      items: response.items.map((mentor) => normalizeMentor(mentor)),
    } as unknown as PaginatedResponse<Mentor>;
  }
  return data;
}

export class MentorManager implements BaseManager<Mentor> {
  /**
   * Get all mentors
   * GET /api/mentors
   */
  async getAll(
    _params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Mentor> | Mentor[]>> {
    try {
      const response = await fetchClient
        .GET("/api/mentors", {
          // @ts-expect-error: Backend Swagger schema mismatch
          params: _params,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: normalizeMentorResponse(response.data as PaginatedResponse<Mentor> | Mentor[]),
      };
    } catch (error) {
      const apiError = error as AppApiError;
      return {
        success: false,
        error: error instanceof Error ? error.message : t("common.unableToLoadMentorList"),
        statusCode: apiError.status,
        traceId: apiError.traceId,
      };
    }
  }

  /**
   * Get mentor by ID
   * GET /api/mentors/{id}
   */
  async getById(id: string | number): Promise<ApiResponse<Mentor>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.MENTOR.DETAIL, {
        id,
      });
      // @ts-expect-error: Backend Swagger schema mismatch
      const response = await fetchClient.GET(endpoint, {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      return {
        success: true,
        data: normalizeMentor(response.data as MentorApiShape),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToDownloadMentor"),
      };
    }
  }

  /**
   * Resolve a mentor record from the currently logged-in user's email.
   *
   * The User and Mentor tables have independent primary keys, so the JWT
   * `sub` (= user id) does NOT match the mentor table id. There is no
   * backend endpoint that takes a userId and returns the corresponding
   * mentor record — only `GET /api/mentors/{mentorId}` and the full list.
   * To bridge the gap, fetch the mentor list and pick the row whose email
   * matches. Returns `null` if no mentor record exists for that email.
   */
  async findByEmail(email: string): Promise<Mentor | null> {
    if (!email) return null;
    const result = await this.getAll();
    if (!result.success || !result.data) return null;

    const list: Mentor[] = Array.isArray(result.data)
      ? result.data
      : ((result.data as { data?: Mentor[]; items?: Mentor[] }).data ??
        (result.data as { items?: Mentor[] }).items ??
        []);

    const target = email.trim().toLowerCase();
    return list.find((m) => (m.email ?? "").trim().toLowerCase() === target) ?? null;
  }

  async getSchedule(options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<MentorScheduleEvent[]>> {
    try {
      const response = await fetchClient.GET("/api/mentors/schedule", {
        params: { query: options },
      });
      return { success: true, data: (response.data ?? []) as MentorScheduleEvent[] };
    } catch (error) {
      const apiError = error as AppApiError;
      return {
        success: false,
        error: error instanceof Error ? error.message : t("common.unableToLoadMentorList"),
        statusCode: apiError.status,
        traceId: apiError.traceId,
      };
    }
  }

  async getScheduleById(
    mentorId: number,
    options?: { startDate?: string; endDate?: string }
  ): Promise<ApiResponse<MentorScheduleEvent[]>> {
    if (!Number.isInteger(mentorId) || mentorId <= 0) {
      return { success: false, error: t("general.invalidId") };
    }
    try {
      const response = await fetchClient.GET("/api/mentors/{mentorId}/schedule", {
        params: { path: { mentorId }, query: options },
      });
      return { success: true, data: (response.data ?? []) as MentorScheduleEvent[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("common.unableToLoadMentorList"),
      };
    }
  }

  /**
   * Create new mentor
   * POST /api/mentors (multipart/form-data)
   * According to schema: { data: MentorInfo, avatar?: File }
   */
  async create(_data: Partial<Mentor> | CreateMentorData): Promise<ApiResponse<Mentor>> {
    try {
      const validationIssue = validateMentorData(_data, { requirePassword: true })[0];
      if (validationIssue) {
        return {
          success: false,
          error: t(validationIssue.messageKey, validationIssue.values),
        };
      }

      const formData = new FormData();

      const mentorInfo: CreateMentorRequest = {
        name: _data.name?.trim(),
        email: _data.email?.trim(),
        password: _data.password,
        bio: _data.bio,
        expertise: _data.expertise,
        yearsOfExperience: _data.yearsOfExperience,
        linkedInUrl: _data.linkedInUrl,
        currentCompany: _data.currentCompany,
        pricePerMinute: _data.pricePerMinute,
        profileData: normalizeProfilePayload(_data.profileData),
      };

      formData.append(
        "data",
        new Blob([JSON.stringify(mentorInfo)], {
          type: "application/json",
        })
      );

      const createData = _data as CreateMentorData;

      if (createData.avatar) {
        formData.append("avatar", createData.avatar);
      }

      // Remove default Content-Type header to let axios set multipart boundary automatically
      const response = await fetchClient
        .POST("/api/mentors", {
          ...{
            headers: {
              "Content-Type": undefined,
            },
          },
          // @ts-expect-error: Backend Swagger schema mismatch
          body: formData,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: normalizeMentor(response.data as MentorApiShape),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.toLowerCase().includes("value too long")) {
        return {
          success: false,
          error: t("adminMentormanagement.validation.serverValueTooLong"),
        };
      }
      return {
        success: false,
        error: message || t("common.cannotCreateMentor"),
      };
    }
  }

  /** Update a mentor with JSON data and an optional replacement avatar. */
  async update(
    _id: string | number,
    _data: Partial<Mentor> | CreateMentorData
  ): Promise<ApiResponse<Mentor>> {
    try {
      const formData = new FormData();

      let existingMentor: Partial<Mentor> = {};
      try {
        const fetchResult = await this.getById(_id);
        if (fetchResult.success && fetchResult.data) {
          existingMentor = fetchResult.data;
        }
      } catch {
        // Ignore
      }

      const validationIssue = validateMentorData(
        { ...existingMentor, ..._data, password: undefined },
        { requirePassword: false }
      )[0];
      if (validationIssue) {
        return {
          success: false,
          error: t(validationIssue.messageKey, validationIssue.values),
        };
      }

      const sourceProfile = _data.profileData ?? existingMentor.profileData;
      const mentorInfo: UpdateMentorRequest = {
        name: (_data.name ?? existingMentor.name)?.trim(),
        email: (_data.email ?? existingMentor.email)?.trim(),
        bio: _data.bio ?? existingMentor.bio,
        expertise: _data.expertise ?? existingMentor.expertise,
        yearsOfExperience: _data.yearsOfExperience ?? existingMentor.yearsOfExperience,
        linkedInUrl: _data.linkedInUrl ?? existingMentor.linkedInUrl,
        currentCompany: _data.currentCompany ?? existingMentor.currentCompany,
        pricePerMinute: _data.pricePerMinute ?? existingMentor.pricePerMinute,
        profileData: normalizeProfilePayload(sourceProfile),
      };

      // Append the 'data' field as a Blob with application/json content type
      // This matches the curl format: --form 'data="...";type=application/json'
      formData.append(
        "data",
        new Blob([JSON.stringify(mentorInfo)], {
          type: "application/json",
        })
      );

      // Add file fields - always send placeholder files to avoid backend NullPointerException
      const updateData = _data as CreateMentorData;
      if (updateData.avatar) {
        formData.append("avatar", updateData.avatar);
      }

      // Use PUT endpoint for update per MENTOR_AVATAR_UPDATE_GUIDE.md
      // PUT /api/mentors/{id}
      // Content-Type: multipart/form-data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (fetchClient as any)
        .PUT(`/api/mentors/${_id}`, {
          headers: {
            "Content-Type": undefined,
          },
          body: formData,
        })
        .then((res: { data: Mentor }) => ({
          data: res.data as Mentor,
          status: res.data,
          headers: undefined,
        }));
      return {
        success: true,
        data: normalizeMentor(response.data as MentorApiShape),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("common.unableToUpdateMentor"),
      };
    }
  }

  /**
   * Toggle mentor active status
   * GET /api/mentors/toggle/{id}
   * According to schema-from-be.d.ts
   */
  async toggleActive(_id: string | number): Promise<ApiResponse<void>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.MENTOR.TOGGLE, {
        id: _id,
      });
      // @ts-expect-error: Backend Swagger schema mismatch
      await fetchClient.GET(endpoint, {});
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.cannotChangeMentorSActive"),
      };
    }
  }

  /**
   * Delete mentor (kept for compatibility, actually toggles active status)
   * @deprecated Use toggleActive instead for better UX
   */
  async delete(_id: string | number): Promise<ApiResponse<void>> {
    const result = await this.toggleActive(_id);
    return {
      success: result.success,
      error: result.error,
    };
  }

  async getRecommended(jdId: number): Promise<ApiResponse<RecommendedMentor[]>> {
    if (!Number.isInteger(jdId) || jdId <= 0) {
      return { success: false, error: t("general.invalidId") };
    }
    try {
      // @ts-expect-error: generated schema predates the backend recommendation route
      const response = await fetchClient.GET("/api/mentors/recommended", {
        params: { query: { jdId } },
      });
      return {
        success: true,
        data: (Array.isArray(response.data) ? response.data : []).map(
          (mentor) => normalizeMentor(mentor as MentorApiShape) as RecommendedMentor
        ),
      };
    } catch (error) {
      const apiError = error as AppApiError;
      return {
        success: false,
        error: error instanceof Error ? error.message : t("common.unableToLoadMentorList"),
        statusCode: apiError.status,
        traceId: apiError.traceId,
      };
    }
  }

  /**
   * Change mentor password
   * PUT /api/mentors/{id}/change-password
   */
  async changePassword(
    id: string | number,
    oldPassword: string,
    newPassword: string
  ): Promise<ApiResponse<Mentor>> {
    try {
      const response = await fetchClient.PUT("/api/mentors/{id}/change-password", {
        params: {
          path: { id: Number(id) },
        },
        body: {
          oldPassword,
          newPassword,
        },
      });

      return {
        success: true,
        data: normalizeMentor(response.data as MentorApiShape),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("changePassword.unableToUpdatePassword"),
      };
    }
  }
}

// Export singleton instance
export const mentorManager = new MentorManager();
