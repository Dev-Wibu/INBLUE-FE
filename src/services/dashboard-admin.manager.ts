import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Dashboard Admin Manager
 * Handles dashboard-specific API operations for administrators
 */

import type { ApiResponse, PaymentEntity } from "@/interfaces";
import { fetchClient } from "@/lib/api";

export interface AdminAnalyticsOverview {
  generatedAt?: string;
  summary?: {
    totalApplications?: number;
    inProgressApplications?: number;
    passedApplications?: number;
    failedApplications?: number;
    activeInterviewCount?: number;
  };
  jobTrends?: Array<{
    rank?: number;
    jobId?: number;
    jobTitle?: string;
    applicationCount?: number;
    percentage?: number;
  }>;
  positionTrends?: Array<{
    rank?: number;
    position?: string;
    applicationCount?: number;
    percentage?: number;
  }>;
  activeInterviews?: Array<{
    applicationDetailId?: number;
    applicationId?: number;
    userId?: number;
    userName?: string;
    userEmail?: string;
    jobId?: number;
    jobTitle?: string;
    roundId?: number;
    roundOrder?: number;
    roundName?: string;
    roundType?: string;
    roundStatus?: string;
    startedAt?: string;
    updatedAt?: string;
  }>;
  recentTransactionDays?: number;
  recentTransactions?: AdminRecentTransaction[];
}

export interface AdminRecentTransaction {
  transactionId?: number;
  id?: number;
  transactionCode?: string | null;
  amount?: number | null;
  description?: string | null;
  status?: string | null;
  createdAt?: string | null;
  userId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  jobId?: number | null;
  jobTitle?: string | null;
  paymentPurpose?: string | null;
  url?: string | null;
}

export interface AdminApplicationsPerUserAnalytics {
  generatedAt?: string;
  totalApplications?: number;
  uniqueApplicants?: number;
  averageApplicationsPerUser?: number;
  traceId?: string;
}

export class DashboardAdminManager {
  /**
   * Get total number of users
   */
  async getTotalUsers(): Promise<ApiResponse<number>> {
    try {
      const response = await fetchClient.GET("/api/dashboard/total-user", {}).then((res) => ({
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
        error: error instanceof Error ? error.message : t("general.unableToGetTotalNumber"),
      };
    }
  }

  /**
   * Get total number of mentors
   */
  async getTotalMentors(): Promise<ApiResponse<number>> {
    try {
      const response = await fetchClient.GET("/api/dashboard/total-mentor", {}).then((res) => ({
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
        error: error instanceof Error ? error.message : t("general.itIsNotPossibleTo"),
      };
    }
  }

  /**
   * Get total income transactions
   */
  async getTotalIncome(): Promise<ApiResponse<PaymentEntity[]>> {
    try {
      const response = await fetchClient.GET("/api/dashboard/total-income", {}).then((res) => ({
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
        error: error instanceof Error ? error.message : t("general.unableToGetRevenueData"),
      };
    }
  }

  /**
   * Get total sessions transactions
   */
  async getTotalSessions(): Promise<ApiResponse<number>> {
    try {
      const response = await fetchClient.GET("/api/dashboard/total-session", {}).then((res) => ({
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
        error: error instanceof Error ? error.message : t("general.unableToGetSessionData"),
      };
    }
  }

  /**
   * Get application trends and currently active interviews.
   * The endpoint is newer than the checked-in generated OpenAPI schema.
   */
  async getAnalyticsOverview(limit = 10, days = 7): Promise<ApiResponse<AdminAnalyticsOverview>> {
    try {
      const response = (await fetchClient.GET(
        "/api/admin/analytics/overview" as never,
        {
          params: { query: { limit, days } },
        } as never
      )) as unknown as { data?: unknown };

      if (response.data) {
        return {
          success: true,
          data: response.data as unknown as AdminAnalyticsOverview,
        };
      }

      return {
        success: false,
        error: t("general.unableToGetAnalyticsData"),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToGetAnalyticsData"),
      };
    }
  }

  async getApplicationsPerUser(): Promise<ApiResponse<AdminApplicationsPerUserAnalytics>> {
    try {
      const response = (await fetchClient.GET(
        "/api/admin/analytics/applications-per-user" as never,
        {} as never
      )) as unknown as { data?: unknown };

      if (response.data) {
        return {
          success: true,
          data: response.data as AdminApplicationsPerUserAnalytics,
        };
      }

      return {
        success: false,
        error: t("general.unableToGetAnalyticsData"),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : t("general.unableToGetAnalyticsData"),
      };
    }
  }
}

// Export singleton instance
export const dashboardAdminManager = new DashboardAdminManager();
