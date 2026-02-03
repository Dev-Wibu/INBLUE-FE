/**
 * ParticipantGrid.tsx
 * Display video participants in a grid layout
 */

import type { DailyParticipant } from "@daily-co/daily-js";
import { Mic, MicOff, User, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import { useVideoCall } from "./useVideoCall";

interface ParticipantTileProps {
  participant: DailyParticipant;
  isLocal?: boolean;
}

function ParticipantTile({ participant, isLocal }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.tracks?.video?.track) {
      const mediaStream = new MediaStream([participant.tracks.video.track]);
      videoRef.current.srcObject = mediaStream;
    }
  }, [participant.tracks?.video?.track]);

  const hasVideo = participant.video;
  const hasAudio = participant.audio;
  const userName = participant.user_name || "Người tham gia";

  return (
    <div
      className={cn(
        "bg-muted relative flex aspect-video items-center justify-center overflow-hidden rounded-lg",
        isLocal && "border-primary border-2"
      )}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="bg-muted-foreground/20 flex h-16 w-16 items-center justify-center rounded-full">
            <User className="text-muted-foreground h-8 w-8" />
          </div>
          <VideoOff className="text-muted-foreground h-5 w-5" />
        </div>
      )}

      {/* Participant info overlay */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <span className="rounded bg-black/50 px-2 py-1 text-sm text-white">
          {userName} {isLocal && "(Bạn)"}
        </span>
        {!hasAudio && <MicOff className="h-4 w-4 text-red-500" />}
        {hasAudio && <Mic className="h-4 w-4 text-green-500" />}
      </div>
    </div>
  );
}

interface ParticipantGridProps {
  className?: string;
}

export function ParticipantGrid({ className }: ParticipantGridProps) {
  const { participants } = useVideoCall();

  const participantList = Object.values(participants);
  const participantCount = participantList.length;

  // Grid layout based on participant count
  const getGridClass = () => {
    if (participantCount <= 1) return "grid-cols-1";
    if (participantCount === 2) return "grid-cols-2";
    if (participantCount <= 4) return "grid-cols-2";
    if (participantCount <= 6) return "grid-cols-3";
    return "grid-cols-4";
  };

  if (participantCount === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <p className="text-muted-foreground">Đang chờ người tham gia...</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", getGridClass(), className)}>
      {participantList.map((participant) => (
        <ParticipantTile
          key={participant.session_id}
          participant={participant}
          isLocal={participant.local}
        />
      ))}
    </div>
  );
}
