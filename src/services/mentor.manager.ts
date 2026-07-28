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
  Mentor,
  PaginatedResponse,
  PaginationParams,
  SchemaMentorInfo,
} from "@/interfaces";
import { fetchClient } from "@/lib/api";

// Re-export Mentor type for convenience
export type { Mentor } from "@/interfaces";
export type MentorInfo = SchemaMentorInfo;

/**
 * Extended mentor data for creation with file uploads
 * Files: avatar
 */
export interface CreateMentorData extends MentorInfo {
  avatar?: File;
  active?: boolean;
}

/**
 * Creates an empty file placeholder for multipart/form-data requests
 * Used as workaround for backend null pointer issues with optional file fields
 */
function createEmptyFilePlaceholder(): File {
  return new File([], "empty.txt", {
    type: "text/plain",
  });
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
        data: response.data as PaginatedResponse<Mentor> | Mentor[],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("common.unableToLoadMentorList"),
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
        data: response.data as Mentor,
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
      : ((result.data as { items?: Mentor[] }).items ?? []);

    const target = email.trim().toLowerCase();
    return list.find((m) => (m.email ?? "").trim().toLowerCase() === target) ?? null;
  }

  /**
   * Create new mentor
   * POST /api/mentors (multipart/form-data)
   * According to schema: { data: MentorInfo, avatar?: File }
   */
  async create(_data: Partial<Mentor> | CreateMentorData): Promise<ApiResponse<Mentor>> {
    try {
      // Validate required fields
      if (!_data.name || !_data.name.trim()) {
        return {
          success: false,
          error: t("general.nameIsRequiredToCreate"),
        };
      }
      if (!_data.email || !_data.email.trim()) {
        return {
          success: false,
          error: t("general.emailIsRequiredToCreate"),
        };
      }

      // According to schema, createMentor uses multipart/form-data
      const formData = new FormData();

      // Prepare MentorInfo data (JSON object)
      // Note: Password should be handled securely by the backend (e.g., hashing)
      // The frontend sends the password in plain text over HTTPS
      // IMPORTANT: Backend comment says POST /api/mentors is shared for create & update
      // When creating, don't include id. When updating, include id.
      // Adding 'active: true' to ensure new mentors are active by default
      const mentorInfo: MentorInfo = {
        name: _data.name.trim(),
        email: _data.email.trim(),
        password: _data.password,
        bio: _data.bio,
        expertise: _data.expertise,
        yearsOfExperience: _data.yearsOfExperience,
        linkedInUrl: _data.linkedInUrl,
        currentCompany: _data.currentCompany,
        pricePerMinute: _data.pricePerMinute,
      };

      // Add active field to the payload to ensure new mentors are active
      // Note: This extends MentorInfo with the active field from Mentor schema
      const mentorPayload = {
        ...mentorInfo,
        active: (_data as Partial<Mentor>).active !== false, // Default true unless explicitly false
      };

      // Append the 'data' field as a Blob with application/json content type
      // This ensures the backend receives proper JSON data within multipart/form-data
      formData.append(
        "data",
        new Blob([JSON.stringify(mentorPayload)], {
          type: "application/json",
        })
      );

      // Add file fields - always send placeholder files to avoid backend NullPointerException
      // Backend code calls file.isEmpty() without null check first, causing 500 error
      // By sending empty files as placeholders, we prevent null pointer exceptions
      const createData = _data as CreateMentorData;

      // Always send avatar to avoid "avatar is null" NullPointerException
      if (createData.avatar) {
        formData.append("avatar", createData.avatar);
      } else {
        formData.append("avatar", createEmptyFilePlaceholder());
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
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("common.cannotCreateMentor"),
      };
    }
  }

  /**
   * Update mentor
   * POST /api/mentors (multipart/form-data with 'data' field containing JSON)
   * Note: Schema comment says POST is shared for create and update
   * "dùng chung cho create và update mentor, nếu create thì ko có id còn update thì có id gửi kèm trong json data á"
   * Translation: if create - no id, if update - include id in the json data
   */
  async update(
    _id: string | number,
    _data: Partial<Mentor> | CreateMentorData
  ): Promise<ApiResponse<Mentor>> {
    try {
      // Backend uses POST /api/mentors for both create and update (multipart/form-data)
      // For update, include 'id' in the JSON data field
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

      // Build MentorInfo payload with id for update.
      // SECURITY/PASSWORD-PRESERVATION NOTE:
      // The backend controller wipes the mentor's password whenever the
      // `password` field is missing from the request body OR arrives as
      // explicit `null`. To keep the existing password we MUST re-send the
      // hash that came back from GET /api/mentors/{id}. We only do that
      // when the field is actually a truthy string — never emit null /
      // undefined / empty.
      const mentorInfo: MentorInfo & {
        active?: boolean;
      } = {
        id: Number(_id),
        name: _data.name?.trim() || existingMentor.name,
        email: _data.email?.trim() || existingMentor.email,
        bio: _data.bio || existingMentor.bio,
        expertise: _data.expertise || existingMentor.expertise,
        yearsOfExperience: _data.yearsOfExperience ?? existingMentor.yearsOfExperience,
        linkedInUrl: _data.linkedInUrl || existingMentor.linkedInUrl,
        currentCompany: _data.currentCompany || existingMentor.currentCompany,
        pricePerMinute: _data.pricePerMinute ?? existingMentor.pricePerMinute,
      };

      // Add active field if provided
      // Note: 'active' is not in MentorInfo schema but BE curl example includes it
      // The BE accepts it for setting mentor active status during update
      if ("active" in _data) {
        mentorInfo.active = Boolean(_data.active);
      } else if (existingMentor.active !== undefined) {
        mentorInfo.active = existingMentor.active;
      }

      // Preserve the existing password. Only re-send if we actually have a
      // truthy string (the BE strips a null/missing field and re-hashes
      // anything we send, so we want to be sure).
      const existingPassword = (existingMentor as { password?: unknown }).password;
      if (typeof existingPassword === "string" && existingPassword.length > 0) {
        mentorInfo.password = existingPassword;
      }
      console.log("Update mentor payload:", JSON.stringify(mentorInfo, null, 2));

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
      } else {
        formData.append("avatar", createEmptyFilePlaceholder());
      }

      // Use POST endpoint (API_ENDPOINTS.MENTOR.CREATE) for BOTH create and update operations
      // Backend schema comment: "dùng chung cho create và update mentor"
      // The difference: create has no id, update includes id in the JSON data
      // Remove Content-Type to let axios set multipart boundary automatically
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
        data: response.data,
      };
    } catch (error) {
      console.error("Update mentor error:", error);
      // Log full error response for debugging
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            data?: unknown;
          };
        };
        console.error("Backend error response:", axiosError.response?.data);
      }
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
  async toggleActive(_id: string | number): Promise<ApiResponse<Mentor>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.MENTOR.TOGGLE, {
        id: _id,
      });
      // @ts-expect-error: Backend Swagger schema mismatch
      const response = await fetchClient.GET(endpoint, {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      return {
        success: true,
        // @ts-expect-error: Backend Swagger schema mismatch
        data: response.data,
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

  /**
   * Change mentor password
   * PUT /api/mentors/change-password
   * Uses query params: oldPass, newPass (similar to user change password)
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await fetchClient
        // @ts-expect-error: Backend Swagger schema mismatch - /api/mentors/change-password not in schema
        .PUT("/api/mentors/change-password", {
          params: {
            query: {
              oldPass: currentPassword,
              newPass: newPassword,
            },
          },
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        // @ts-expect-error: Backend Swagger schema mismatch
        data: response.data as { message: string },
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
