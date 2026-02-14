/**
 * VideoCallRoom.tsx
 * Main video call room component using Daily.co iframe (createFrame)
 * Matches VideoCall-Fe: full Daily.co UI with pre-call lobby, device settings, call controls
 */

import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useVideoCall } from "./useVideoCall";

interface VideoCallRoomProps {
  roomUrl: string;
  userName: string;
  onLeave?: () => void;
  onError?: (_error: string) => void;
  onJoined?: (_participantId: string) => void;
  className?: string;
}

export function VideoCallRoom({
  roomUrl,
  userName,
  onLeave,
  onError,
  onJoined,
  className,
}: VideoCallRoomProps) {
  const { joinRoom, roomState, error, callObject } = useVideoCall();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCalledOnJoined = useRef(false);
  const hasStartedJoin = useRef(false);

  // Reset flags when roomUrl changes (new room)
  useEffect(() => {
    hasCalledOnJoined.current = false;
    hasStartedJoin.current = false;
  }, [roomUrl]);

  // Join room on mount - pass container element for iframe
  useEffect(() => {
    if (
      roomUrl &&
      userName &&
      roomState === "idle" &&
      containerRef.current &&
      !hasStartedJoin.current
    ) {
      hasStartedJoin.current = true;
      joinRoom(roomUrl, userName, containerRef.current);
    }
  }, [roomUrl, userName, roomState, joinRoom]);

  // Handle error callback
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Handle joined callback - fire only once per room
  useEffect(() => {
    if (roomState === "joined" && callObject && onJoined && !hasCalledOnJoined.current) {
      const localParticipant = callObject.participants()?.local;
      if (localParticipant?.session_id) {
        hasCalledOnJoined.current = true;
        onJoined(localParticipant.session_id);
      }
    }
  }, [roomState, callObject, onJoined]);

  // Handle leave callback
  const handleLeave = useCallback(() => {
    onLeave?.();
  }, [onLeave]);

  // Trigger leave callback when room state becomes "left"
  useEffect(() => {
    if (roomState === "left") {
      handleLeave();
    }
  }, [roomState, handleLeave]);

  // Render error state
  if (roomState === "error") {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi kết nối</AlertTitle>
            <AlertDescription>{error || "Đã xảy ra lỗi khi kết nối cuộc gọi."}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Render left state
  if (roomState === "left") {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
          <p className="text-muted-foreground text-lg">Bạn đã rời khỏi phòng họp.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex h-full w-full flex-col overflow-hidden", className)}>
      <CardContent className="relative flex-1 p-0">
        {/* Daily.co iframe container - matches VideoCall-Fe #video-container */}
        {/* Daily.co iframe handles its own pre-call lobby, device settings, and call controls */}
        <div ref={containerRef} className="h-full min-h-[600px] w-full" />
      </CardContent>
    </Card>
  );
}
