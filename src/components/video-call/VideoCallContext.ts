/**
 * VideoCallContext.ts
 * React context for video call state
 */

import type { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import { createContext } from "react";

export type RoomState = "idle" | "joining" | "joined" | "leaving" | "error";

export interface VideoCallContextValue {
  callObject: DailyCall | null;
  participants: Record<string, DailyParticipant>;
  roomState: RoomState;
  error: string | null;
  localVideo: boolean;
  localAudio: boolean;
  joinRoom: (roomUrl: string, userName: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleVideo: () => void;
  toggleAudio: () => void;
}

export const VideoCallContext = createContext<VideoCallContextValue | null>(null);
