/**
 * VideoCallContext.ts
 * React context for video call state
 */

import type { DailyCall, DailyParticipantsObject } from "@daily-co/daily-js";
import { createContext } from "react";

export type RoomState = "idle" | "joining" | "joined" | "leaving" | "left" | "error";

export interface ParticipantPayload {
  participantId: string;
  userName?: string;
  /** True when this participant is the local browser tab (i.e. "me"). */
  isLocal?: boolean;
  /** True when the remote participant is a mentor (per the calling page). */
  isMentor?: boolean;
  /** Number of participants still in the room (incl. me). */
  participantCount?: number;
}

/**
 * 2026-07-13 v062: expose granular Daily.co events to consumers so the
 *   session-page can react to the peer leaving even when we are still
 *   inside the room. These callbacks are best-effort — BE receives its
 *   own webhook directly from Daily.co, this is the FE-side mirror.
 */
export interface VideoCallCallbacks {
  onParticipantJoined?: (_p: ParticipantPayload) => void;
  onParticipantLeft?: (_p: ParticipantPayload) => void;
  onParticipantCountUpdated?: (_info: { participantCount: number; localIsAlone: boolean }) => void;
}

export interface VideoCallContextValue {
  callObject: DailyCall | null;
  roomState: RoomState;
  error: string | null;
  joinRoom: (
    _roomUrl: string,
    _userName: string,
    _container: HTMLElement,
    _callbacks?: VideoCallCallbacks
  ) => Promise<void>;
  leaveRoom: () => Promise<void>;
  participants?: DailyParticipantsObject;
}

export const VideoCallContext = createContext<VideoCallContextValue | null>(null);
