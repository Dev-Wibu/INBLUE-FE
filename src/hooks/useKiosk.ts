import { getNormalizedErrorMessage } from "@/lib/error-normalizer";
import i18n from "@/lib/i18n";
import { kioskBookingManager } from "@/services/kiosk-booking.manager";
import type {
  Kiosk,
  KioskEnterDtoResponse,
  MentorInterviewBooking,
  SlotDto,
} from "@/services/kiosk.manager";
import { kioskManager } from "@/services/kiosk.manager";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
const t = i18n.t.bind(i18n);

export const useActiveKiosks = (enabled = true) => {
  return useQuery({
    queryKey: ["kiosks", "active"],
    queryFn: async (): Promise<Kiosk[]> => {
      const result = await kioskManager.getActiveKiosks();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data ?? [];
    },
    enabled,
    staleTime: 60_000,
  });
};

export const useKioskSlots = (kioskId: number, date: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ["kiosks", kioskId, "slots", date],
    queryFn: async (): Promise<SlotDto[]> => {
      if (!date) return [];
      const result = await kioskManager.getAvailableSlots(kioskId, date);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data ?? [];
    },
    enabled: enabled && !!kioskId && !!date,
    staleTime: 30_000,
  });
};

/**
 * Aggregates 7 daily slot queries into a single week view, matching the
 * mentor-booking mockup (`docs/mentor_booking_ui_mockup.html`): FE calls
 * `/api/kiosks/{id}/slots?date=` per day and the calendar merges them.
 */
export const useKioskWeekSlots = (
  kioskId: number | undefined | null,
  weekStart: Date,
  enabled = true
) => {
  return useQueries({
    queries: Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      // Keep strict YYYY-MM-DD based on local date (not UTC) so kiosk schedules
      // configured in local time align with the BE side.
      const y = day.getFullYear();
      const m = String(day.getMonth() + 1).padStart(2, "0");
      const d = String(day.getDate()).padStart(2, "0");
      const dateString = `${y}-${m}-${d}`;
      return {
        queryKey: ["kiosks", kioskId, "slots", dateString],
        queryFn: async (): Promise<SlotDto[]> => {
          if (!kioskId) return [];
          const result = await kioskManager.getAvailableSlots(kioskId, dateString);
          if (!result.success) {
            throw new Error(result.error);
          }
          return result.data ?? [];
        },
        enabled: enabled && !!kioskId,
        staleTime: 30_000,
      };
    }),
  });
};

export const usePickKioskSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      applicationDetailId: number;
      kioskId: number;
      scheduledStart: string;
      scheduledEnd: string;
    }) => {
      const result = await kioskManager.pickSlot({
        applicationDetailId: params.applicationDetailId,
        kioskId: params.kioskId,
        scheduledStart: params.scheduledStart,
        scheduledEnd: params.scheduledEnd,
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success(t("userKiosk.bookingRequestSent"));
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["kiosks"] });
        queryClient.invalidateQueries({ queryKey: ["kiosk-booking", data.id] });
      }
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("userKiosk.unableToBookKioskSlot")));
    },
  });
};

export const useKioskBooking = (bookingId: number | undefined, enabled = true) => {
  return useQuery({
    queryKey: ["kiosk-booking", bookingId],
    queryFn: async (): Promise<MentorInterviewBooking | null> => {
      if (!bookingId) return null;
      const result = await kioskManager.getBooking(bookingId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data ?? null;
    },
    enabled: enabled && !!bookingId,
    staleTime: 30_000,
  });
};

export const useEnterKiosk = () => {
  return useMutation({
    mutationFn: async (params: { sessionKey: string; kioskId: number }) => {
      const result = await kioskManager.enterKiosk({
        sessionKey: params.sessionKey,
        kioskId: params.kioskId,
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data as KioskEnterDtoResponse;
    },
    onSuccess: () => {
      toast.success(t("userKiosk.roomUrlRetrievedSuccessfully"));
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("userKiosk.unableToGetRoomUrl")));
    },
  });
};

export const useKioskUserBookings = (userId: number | undefined) => {
  return useQuery({
    queryKey: ["kiosk-bookings", "user", userId],
    queryFn: async (): Promise<MentorInterviewBooking[]> => {
      if (!userId) return [];
      const result = await kioskBookingManager.getBookingsByUser(userId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data ?? [];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
};

export const useCancelKioskBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: number) => {
      const result = await kioskBookingManager.cancelBooking(bookingId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return bookingId;
    },
    onSuccess: (_data, bookingId) => {
      toast.success(t("userKiosk.bookingCancelledSuccessfully"));
      queryClient.invalidateQueries({ queryKey: ["kiosk-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["kiosk-booking", bookingId] });
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("userKiosk.unableToCancelBooking")));
    },
  });
};
