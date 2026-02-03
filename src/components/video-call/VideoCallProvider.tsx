/**
 * VideoCallProvider.tsx
 * Manages Daily.co callObject lifecycle
 * Provides context for room state, participants, errors
 * Based on VideoCall-Fe reference implementation
 */

import type { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import DailyIframe from "@daily-co/daily-js";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  // Cleanup call object on unmount
  useEffect(() => {
    return () => {
      if (callObject) {
        callObject.destroy();
      }
    };
  }, [callObject]);

  // Join room handler
  const joinRoom = useCallback(
    async (roomUrl: string, userName: string) => {
      if (!roomUrl) {
        setError("Thiếu URL phòng họp.");
        return;
      }

      try {
        setRoomState("joining");
        setError(null);

        // Destroy existing call object if any (avoid duplicate)
        if (callObject) {
          await callObject.destroy();
          setCallObject(null);
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
          setError(event?.error?.message || "Đã xảy ra lỗi khi kết nối cuộc gọi.");
          setRoomState("error");
        });

        setCallObject(newCallObject);

        // Join the meeting
        await newCallObject.join({
          userName,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tham gia phòng họp.");
        setRoomState("error");
      }
    },
    [callObject]
  );

  // Leave room handler
  const leaveRoom = useCallback(async () => {
    if (!callObject) return;

    try {
      setRoomState("leaving");
      await callObject.leave();
      await callObject.destroy();
      setCallObject(null);
      setParticipants({});
      setRoomState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể rời phòng họp.");
    }
  }, [callObject]);

  // Toggle video handler
  const toggleVideo = useCallback(() => {
    if (!callObject) return;
    const newState = !localVideo;
    callObject.setLocalVideo(newState);
    setLocalVideo(newState);
  }, [callObject, localVideo]);

  // Toggle audio handler
  const toggleAudio = useCallback(() => {
    if (!callObject) return;
    const newState = !localAudio;
    callObject.setLocalAudio(newState);
    setLocalAudio(newState);
  }, [callObject, localAudio]);

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
