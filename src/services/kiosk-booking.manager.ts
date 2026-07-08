import type { ApiResponse } from "@/interfaces";
import { fetchClient } from "@/lib/api";
import type { KioskBooking, Mentor } from "@/pages/Admin/KioskBookingManagement/types";

export class KioskBookingManager {
  async getAllBookings(): Promise<ApiResponse<KioskBooking[]>> {
    try {
      const response = await fetchClient.GET("/api/admin/mentor-bookings", {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
      }));
      if (response.data) {
        return { success: true, data: response.data };
      }
      return {
        success: false,
        error: String(response.data),
      };
    } catch (error) {
      console.error("[KioskBookingManager] getAllBookings error:", error);
      return { success: false, error: String(error) };
    }
  }

  async getBookingsByUser(userId: number): Promise<ApiResponse<KioskBooking[]>> {
    try {
      const response = await fetchClient.GET("/api/admin/mentor-bookings", {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
      }));
      if (response.data) {
        const filtered = response.data.filter((b) => b.applicantUserId === userId);
        return { success: true, data: filtered };
      }
      return {
        success: false,
        error: String(response.data),
      };
    } catch (error) {
      console.error("[KioskBookingManager] getBookingsByUser error:", error);
      return { success: false, error: String(error) };
    }
  }

  async getMentors(): Promise<ApiResponse<Mentor[]>> {
    try {
      const response = await fetchClient.GET("/api/mentors", {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
      }));
      if (response.data) {
        return { success: true, data: response.data };
      }
      return {
        success: false,
        error: String(response.data),
      };
    } catch (error) {
      console.error("[KioskBookingManager] getMentors error:", error);
      return { success: false, error: String(error) };
    }
  }

  async assignMentor(
    bookingId: number,
    payload: { mentorId: number; notes?: string }
  ): Promise<ApiResponse<unknown>> {
    try {
      const response = await fetchClient
        .POST("/api/admin/mentor-bookings/{bookingId}/assign-mentor", {
          params: { path: { bookingId } },
          body: payload as never,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
        }));
      if (response.data !== undefined) {
        return { success: true, data: response.data };
      }
      return {
        success: false,
        error: String(response.data),
      };
    } catch (error) {
      console.error("[KioskBookingManager] assignMentor error:", error);
      return { success: false, error: String(error) };
    }
  }
}

export const kioskBookingManager = new KioskBookingManager();
