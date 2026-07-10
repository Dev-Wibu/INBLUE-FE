import type {
  Kiosk as KioskApi,
  KioskSchedule as KioskScheduleApi,
} from "@/services/kiosk.manager";

export type Kiosk = NonNullable<KioskApi>;
export type KioskSchedule = NonNullable<KioskScheduleApi>;
export type DayOfWeek = NonNullable<KioskSchedule["dayOfWeek"]>;

export interface KioskFormValues {
  name: string;
  location: string;
  isActive: boolean;
}

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export interface ScheduleFormValues {
  kioskId: number;
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

export const SLOT_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
