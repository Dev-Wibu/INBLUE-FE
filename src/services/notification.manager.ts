import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Notification Manager
 * Handles notification CRUD operations
 * Based on schema-from-be.d.ts API specification
 */

import { API_ENDPOINTS, buildEndpoint } from "@/constants/api.config";
import type { ApiResponse, BaseManager, PaginatedResponse, PaginationParams } from "@/interfaces";
import type { User } from "@/interfaces/schema.types";
import { fetchClient } from "@/lib/api";

/**
 * Notification type based on backend schema
 */
export interface Notification {
  id?: number;
  user?: User;
  title?: string;
  message?: string;
  isRead?: boolean;
  createAt?: string;
}

/**
 * Form data for create operations
 */
export interface NotificationFormData {
  userId: number;
  title: string;
  message: string;
}

export class NotificationManager implements BaseManager<Notification> {
  /**
   * Get all notifications for a user
   * GET /api/notifications/{id}
   */
  async getAll(
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Notification> | Notification[]>> {
    // Suppress unused variable warning - params not used in mock mode
    void params;

    // Note: This endpoint requires userId in path
    return {
      success: false,
      error: t("general.pleaseUseTheGetbyuseridMethod"),
    };
  }

  /**
   * Get notifications by user ID
   * GET /api/notifications/{id}
   */
  async getByUserId(userId: string | number): Promise<ApiResponse<Notification[]>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.NOTIFICATIONS.LIST, { id: userId });
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
        error: error instanceof Error ? error.message : t("general.unableToLoadNotification"),
      };
    }
  }

  /**
   * Get notification by ID
   * Note: The schema doesn't have a specific single notification endpoint
   */
  async getById(id: string | number): Promise<ApiResponse<Notification>> {
    void id;

    return {
      success: false,
      error: t("general.theApiDoesNotSupport"),
    };
  }

  /**
   * Create new notification
   * POST /api/notifications (JSON body)
   * Backend requires full Notification schema including id: 0 for creation
   */
  async create(data: Partial<Notification>): Promise<ApiResponse<Notification>> {
    try {
      // Backend requires full Notification schema for creation
      // id: 0 indicates new record creation
      const notificationPayload: Notification = {
        id: 0, // Required: 0 for creation
        user: data.user,
        title: data.title,
        message: data.message,
        isRead: data.isRead ?? false,
        createAt: data.createAt ?? new Date().toISOString(),
      };
      const response = await fetchClient
        .POST("/api/notifications", { body: notificationPayload })
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
        error: error instanceof Error ? error.message : t("general.unableToCreateNotification"),
      };
    }
  }

  /**
   * Mark notification as read
   * GET /api/notifications/check-read/{notificationId}
   */
  async markAsRead(notificationId: string | number): Promise<ApiResponse<boolean>> {
    try {
      const endpoint = buildEndpoint(API_ENDPOINTS.NOTIFICATIONS.CHECK_READ, { notificationId });
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
        error: error instanceof Error ? error.message : t("general.notificationsCannotBeMarkedAs"),
      };
    }
  }

  /**
   * Update notification (not supported by current API)
   */
  async update(
    id: string | number,
    data: Partial<Notification>
  ): Promise<ApiResponse<Notification>> {
    // Suppress unused variable warnings - update not supported
    void id;
    void data;

    return {
      success: false,
      error: t("general.notificationUpdatesAreNotSupported"),
    };
  }

  /**
   * Delete notification (not supported by current API)
   */
  async delete(_id: string | number): Promise<ApiResponse<void>> {
    void _id;

    return {
      success: false,
      error: t("general.clearingNotificationsIsNotSupported"),
    };
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();
