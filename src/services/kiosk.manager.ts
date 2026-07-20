import type { ApiResponse } from "@/interfaces";
import { fetchClient } from "@/lib/api";
import i18n from "@/lib/i18n";
import type { TFunction } from "i18next";
import type { components } from "../../schema-from-be";

export type Kiosk = components["schemas"]["Kiosk"];
export type KioskSchedule = components["schemas"]["KioskSchedule"];
export type SlotDto = components["schemas"]["SlotDto"];
export type PickSlotDtoRequest = components["schemas"]["PickSlotDtoRequest"];
export type MentorInterviewBooking = components["schemas"]["KioskBooking"];
export type KioskEnterDtoRequest = components["schemas"]["KioskEnterDtoRequest"];
export type KioskEnterDtoResponse = components["schemas"]["KioskEnterDtoResponse"];

const toApiUrl = (path: string) =>
  `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}${path}`;

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export class KioskManager {
  private t: TFunction;

  constructor() {
    this.t = i18n.t.bind(i18n);
  }

  private getErrorMsg(error: unknown): string {
    if (error instanceof Error) return error.message;
    return "";
  }

  private extractErrorMessage(error: unknown): string {
    const msg = this.getErrorMsg(error);
    if (msg) return msg;
    return this.t("general.anUnknownErrorHasOccurred");
  }

  async getActiveKiosks(): Promise<ApiResponse<Kiosk[]>> {
    try {
      const response = await fetchClient.GET("/api/kiosks", {}).then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
      return {
        success: true,
        data: (response.data ?? []) as Kiosk[],
      };
    } catch (error) {
      console.error("[KioskManager] getActiveKiosks error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  async createKiosk(body: {
    name: string;
    location: string;
    isActive: boolean;
  }): Promise<ApiResponse<Kiosk>> {
    try {
      const response = await fetchClient
        .POST("/api/kiosks", {
          body: body as never,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: response.data as Kiosk,
      };
    } catch (error) {
      console.error("[KioskManager] createKiosk error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  async updateKiosk(
    id: number,
    body: { name: string; location: string; isActive: boolean }
  ): Promise<ApiResponse<Kiosk>> {
    try {
      const response = await fetchClient
        .PUT("/api/kiosks/{id}", {
          params: { path: { id } },
          body: body as never,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: response.data as Kiosk,
      };
    } catch (error) {
      console.error("[KioskManager] updateKiosk error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  async getSchedulesByKiosk(kioskId: number): Promise<ApiResponse<KioskSchedule[]>> {
    try {
      const response = await fetchClient
        .GET("/api/kiosks/{kioskId}/schedules", {
          params: { path: { kioskId } },
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: (response.data ?? []) as KioskSchedule[],
      };
    } catch (error) {
      console.error("[KioskManager] getSchedulesByKiosk error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  async createSchedule(body: {
    kioskId: number;
    dayOfWeek: KioskSchedule["dayOfWeek"];
    openTime: string;
    closeTime: string;
    slotDurationMinutes: number;
    isActive: boolean;
  }): Promise<ApiResponse<KioskSchedule>> {
    try {
      const response = await fetchClient
        .POST("/api/kiosks/schedule", {
          body: body as never,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: response.data as KioskSchedule,
      };
    } catch (error) {
      console.error("[KioskManager] createSchedule error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  async updateSchedule(
    id: number,
    body: {
      kioskId: number;
      dayOfWeek: KioskSchedule["dayOfWeek"];
      openTime: string;
      closeTime: string;
      slotDurationMinutes: number;
      isActive: boolean;
    }
  ): Promise<ApiResponse<KioskSchedule>> {
    try {
      const response = await fetchClient
        .PUT("/api/kiosks/schedule/{id}", {
          params: { path: { id } },
          body: body as never,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: response.data as KioskSchedule,
      };
    } catch (error) {
      console.error("[KioskManager] updateSchedule error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  async getAvailableSlots(kioskId: number, date: string): Promise<ApiResponse<SlotDto[]>> {
    try {
      const response = await fetchClient
        .GET("/api/kiosks/{kioskId}/slots", {
          params: { path: { kioskId }, query: { date } },
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: (response.data ?? []) as SlotDto[],
      };
    } catch (error) {
      console.error("[KioskManager] getAvailableSlots error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  async pickSlot(body: PickSlotDtoRequest): Promise<ApiResponse<MentorInterviewBooking>> {
    try {
      const response = await fetchClient
        .POST("/api/kiosk-bookings/pick-slot", {
          body: {
            applicationDetailId: body.applicationDetailId,
            kioskId: body.kioskId,
            scheduledStart: body.scheduledStart,
            scheduledEnd: body.scheduledEnd,
          } as never,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: response.data as MentorInterviewBooking,
      };
    } catch (error) {
      console.error("[KioskManager] pickSlot error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  async getBooking(bookingId: number): Promise<ApiResponse<MentorInterviewBooking>> {
    try {
      const url = toApiUrl("/api/mentor-bookings/") + encodeURIComponent(String(bookingId));
      const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });

      if (!response.ok) {
        const data = await parseJson(response);
        let message = this.t("general.anErrorHasOccurred");
        if (data && typeof data === "object" && "message" in data) {
          message = String((data as Record<string, unknown>)["message"]);
        }
        return { success: false, error: message };
      }

      const data = await parseJson(response);
      return { success: true, data: (data ?? null) as MentorInterviewBooking };
    } catch (error) {
      console.error("[KioskManager] getBooking error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }

  async enterKiosk(body: KioskEnterDtoRequest): Promise<ApiResponse<KioskEnterDtoResponse>> {
    try {
      const response = await fetchClient
        .POST("/api/kiosk/enter", {
          body: {
            sessionKey: body.sessionKey,
            kioskId: body.kioskId,
          } as never,
        })
        .then((res) => ({
          data: res.data,
          status: res.response?.status,
          headers: res.response?.headers,
        }));
      return {
        success: true,
        data: response.data as KioskEnterDtoResponse,
      };
    } catch (error) {
      console.error("[KioskManager] enterKiosk error:", error);
      return {
        success: false,
        error: this.extractErrorMessage(error),
      };
    }
  }
}

export const kioskManager = new KioskManager();
