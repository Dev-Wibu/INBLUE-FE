/**
 * VideoCallContext.ts
 * React context for video call state
 */

import type { DailyCall } from "@daily-co/daily-js";
import { createContext } from "react";

export type RoomState = "idle" | "joining" | "joined" | "leaving" | "left" | "error";

export interface VideoCallContextValue {
  callObject: DailyCall | null;
  roomState: RoomState;
  error: string | null;
  joinRoom: (_roomUrl: string, _userName: string, _container: HTMLElement) => Promise<void>;
  leaveRoom: () => Promise<void>;
}

export const VideoCallContext = createContext<VideoCallContextValue | null>(null);
