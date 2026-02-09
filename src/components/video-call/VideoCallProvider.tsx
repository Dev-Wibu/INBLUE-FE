/**
 * VideoCallProvider.tsx
 * Manages Daily.co callObject lifecycle
 * Provides context for room state, participants, errors
 * Based on VideoCall-Fe reference implementation
 */

import type { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import DailyIframe from "@daily-co/daily-js";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RoomState, VideoCallContextValue } from "./VideoCallContext";
import { VideoCallContext } from "./VideoCallContext";

interface VideoCallProviderProps {
  children: ReactNode;
}

export function VideoCallProvider({ children }: VideoCallProviderProps) {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [participants, setParticipants] = useState<Record<string, DailyParticipant>>({});
  const [roomState, setRoomState] = useState<RoomState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localVideo, setLocalVideo] = useState(true);
  const [localAudio, setLocalAudio] = useState(true);

  // Use ref to track callObject for stable callbacks (avoids stale closures)
  const callObjectRef = useRef<DailyCall | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    callObjectRef.current = callObject;
  }, [callObject]);

  // Cleanup call object on unmount only
  useEffect(() => {
    return () => {
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
      }
    };
  }, []);

  // Join room handler
  const joinRoom = useCallback(async (roomUrl: string, userName: string) => {
    if (!roomUrl) {
      setError("Thiếu URL phòng họp.");
      return;
    }

    try {
      setRoomState("joining");
      setError(null);

      // Destroy existing call object if any (avoid duplicate)
      if (callObjectRef.current) {
        await callObjectRef.current.destroy();
        callObjectRef.current = null;
        setCallObject(null);
      }

      // Also check for any existing Daily instance globally (prevent "Duplicate DailyIframe")
      try {
        const existingInstance = DailyIframe.getCallInstance();
        if (existingInstance) {
          await existingInstance.destroy();
        }
      } catch {
        // Ignore cleanup errors - proceed with creating new instance
      }

      // Create new Daily call frame
      const newCallObject = DailyIframe.createCallObject({
        url: roomUrl,
      });

      // Set up event listeners
      newCallObject.on("joined-meeting", () => {
        setRoomState("joined");
        setParticipants(newCallObject.participants());
      });

      newCallObject.on("left-meeting", () => {
        setRoomState("idle");
        setParticipants({});
      });

      newCallObject.on("participant-joined", () => {
        setParticipants(newCallObject.participants());
      });

      newCallObject.on("participant-updated", () => {
        setParticipants(newCallObject.participants());
      });

      newCallObject.on("participant-left", () => {
        setParticipants(newCallObject.participants());
      });

      newCallObject.on("error", (event) => {
        setError(event?.errorMsg || "Đã xảy ra lỗi khi kết nối cuộc gọi.");
        setRoomState("error");
      });

      callObjectRef.current = newCallObject;
      setCallObject(newCallObject);

      // Join the meeting
      await newCallObject.join({
        userName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tham gia phòng họp.");
      setRoomState("error");
    }
  }, []);

  // Leave room handler
  const leaveRoom = useCallback(async () => {
    if (!callObjectRef.current) return;

    try {
      setRoomState("leaving");
      await callObjectRef.current.leave();
      await callObjectRef.current.destroy();
      callObjectRef.current = null;
      setCallObject(null);
      setParticipants({});
      setRoomState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể rời phòng họp.");
    }
  }, []);

  // Toggle video handler
  const toggleVideo = useCallback(() => {
    if (!callObjectRef.current) return;
    setLocalVideo((prev) => {
      const newState = !prev;
      callObjectRef.current?.setLocalVideo(newState);
      return newState;
    });
  }, []);

  // Toggle audio handler
  const toggleAudio = useCallback(() => {
    if (!callObjectRef.current) return;
    setLocalAudio((prev) => {
      const newState = !prev;
      callObjectRef.current?.setLocalAudio(newState);
      return newState;
    });
  }, []);

  // Memoize context value
  const value = useMemo<VideoCallContextValue>(
    () => ({
      callObject,
      participants,
      roomState,
      error,
      localVideo,
      localAudio,
      joinRoom,
      leaveRoom,
      toggleVideo,
      toggleAudio,
    }),
    [
      callObject,
      participants,
      roomState,
      error,
      localVideo,
      localAudio,
      joinRoom,
      leaveRoom,
      toggleVideo,
      toggleAudio,
    ]
  );

  return <VideoCallContext.Provider value={value}>{children}</VideoCallContext.Provider>;
}
