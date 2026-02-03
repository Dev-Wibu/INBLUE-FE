/**
 * VideoCallRoom.tsx
 * Main video call room component
 * Integrates VideoCallProvider, ParticipantGrid, VideoControls
 */

import { AlertCircle } from "lucide-react";
import { useCallback, useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ParticipantGrid } from "./ParticipantGrid";
import { useVideoCall } from "./useVideoCall";
import { VideoCallLoader } from "./VideoCallLoader";
import { VideoControls } from "./VideoControls";

interface VideoCallRoomProps {
  roomUrl: string;
  userName: string;
  onLeave?: () => void;
  onError?: (error: string) => void;
  onJoined?: (participantId: string) => void;
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

  // Join room on mount
  useEffect(() => {
    if (roomUrl && userName && roomState === "idle") {
      joinRoom(roomUrl, userName);
    }
  }, [roomUrl, userName, roomState, joinRoom]);

  // Handle error callback
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Handle joined callback
  useEffect(() => {
    if (roomState === "joined" && callObject && onJoined) {
      const localParticipant = callObject.participants()?.local;
      if (localParticipant?.session_id) {
        onJoined(localParticipant.session_id);
      }
    }
  }, [roomState, callObject, onJoined]);

  // Handle leave callback
  const handleLeave = useCallback(() => {
    onLeave?.();
  }, [onLeave]);

  // Render based on room state
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

  if (roomState === "joining") {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center p-8">
          <VideoCallLoader message="Đang kết nối vào phòng họp..." />
        </CardContent>
      </Card>
    );
  }

  if (roomState === "leaving") {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center p-8">
          <VideoCallLoader message="Đang rời khỏi phòng họp..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex h-full w-full flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
          Phòng phỏng vấn
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Participant Grid */}
        <div className="bg-muted/30 flex-1 overflow-hidden rounded-lg border">
          <ParticipantGrid className="h-full p-4" />
        </div>

        {/* Video Controls */}
        <div className="flex justify-center border-t pt-4">
          <VideoControls onLeave={handleLeave} />
        </div>
      </CardContent>
    </Card>
  );
}
