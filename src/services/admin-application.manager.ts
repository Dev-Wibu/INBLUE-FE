import type { ApiResponse } from "@/interfaces";
import { fetchClient } from "@/lib/api";
import type { components } from "../../schema-from-be";

export type AdminOpenJdResponseDto = components["schemas"]["AdminOpenJdResponseDto"];
export type AdminJdApplicationsResponseDto =
  components["schemas"]["AdminJdApplicationsResponseDto"];
export type AdminApplicationFullDetailResponseDto =
  components["schemas"]["AdminApplicationFullDetailResponseDto"];
export type ApplicationListItemDto = components["schemas"]["AdminApplicationSummaryDto"];
export type CandidateRoundDetailDto = components["schemas"]["AdminRoundDetailDto"];

export class AdminApplicationManager {
  /**
   * GET /api/admin/open-jds
   * Lấy danh sách các JD theo công ty (Hỗ trợ lọc theo trạng thái OPEN, CLOSED, DRAFT hoặc lấy tất cả)
   */
  async getOpenJds(
    status?: "OPEN" | "CLOSED" | "DRAFT"
  ): Promise<ApiResponse<AdminOpenJdResponseDto[]>> {
    try {
      const query = status ? { status } : undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await fetchClient.GET("/api/admin/open-jds", { query } as any);

      if (response.data) {
        return {
          success: true,
          data: response.data as unknown as AdminOpenJdResponseDto[],
        };
      }

      return {
        success: false,
        error: "Không thể lấy danh sách JD mở",
      };
    } catch (err) {
      console.error(err);
      return {
        success: false,
        error: "Lỗi kết nối máy chủ",
      };
    }
  }

  /**
   * GET /api/admin/jds/{jdId}/applications
   * Lấy danh sách các lượt apply của một JD cụ thể
   */
  async getApplicationsByJdId(jdId: number): Promise<ApiResponse<AdminJdApplicationsResponseDto>> {
    try {
      const response = await fetchClient.GET("/api/admin/jds/{jdId}/applications", {
        params: {
          path: { jdId },
        },
      });

      if (response.data) {
        return {
          success: true,
          data: response.data as unknown as AdminJdApplicationsResponseDto,
        };
      }

      return {
        success: false,
        error: "Không thể lấy danh sách ứng viên nộp đơn",
      };
    } catch (err) {
      console.error(err);
      return {
        success: false,
        error: "Lỗi kết nối máy chủ",
      };
    }
  }

  /**
   * GET /api/admin/applications/{applicationId}/detail
   * Lấy chi tiết sâu toàn diện của một đơn ứng tuyển (Application Detail)
   */
  async getApplicationFullDetail(
    applicationId: number
  ): Promise<ApiResponse<AdminApplicationFullDetailResponseDto>> {
    try {
      const response = await fetchClient.GET("/api/admin/applications/{applicationId}/detail", {
        params: {
          path: { applicationId },
        },
      });

      if (response.data) {
        return {
          success: true,
          data: response.data as unknown as AdminApplicationFullDetailResponseDto,
        };
      }

      return {
        success: false,
        error: "Không thể lấy chi tiết đơn ứng tuyển",
      };
    } catch (err) {
      console.error(err);
      return {
        success: false,
        error: "Lỗi kết nối máy chủ",
      };
    }
  }
}

export const adminApplicationManager = new AdminApplicationManager();
