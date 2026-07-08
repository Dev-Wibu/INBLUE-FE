import type { MentorInterviewBooking } from "@/services/kiosk.manager";

export type KioskBooking = MentorInterviewBooking;

export type KioskBookingStatus = MentorInterviewBooking["status"];

export interface Mentor {
  id?: number;
  name?: string;
  email?: string;
  expertise?: string;
  isActive?: boolean;
}

export interface Kiosk {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
}

export interface EnrichedKioskBooking extends KioskBooking {
  userName?: string;
  userEmail?: string;
  jobTitle?: string;
  companyName?: string;
  kioskName?: string;
  kioskLocation?: string;
  mentorName?: string;
  mentorExpertise?: string;
}

export interface AssignMentorPayload {
  mentorId?: number;
  notes?: string;
}

export type StatusFilter = "all" | KioskBookingStatus;
