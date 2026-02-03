/**
 * VideoControls.tsx
 * Mute/unmute, camera toggle, leave call controls
 */

import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useVideoCall } from "./useVideoCall";

interface VideoControlsProps {
  onLeave?: () => void;
  className?: string;
}

export function VideoControls({ onLeave, className }: VideoControlsProps) {
  const { localVideo, localAudio, toggleVideo, toggleAudio, leaveRoom, roomState } = useVideoCall();

  const handleLeave = async () => {
    await leaveRoom();
    onLeave?.();
  };

  const isDisabled = roomState !== "joined";

  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      {/* Toggle Audio Button */}
      <Button
        variant={localAudio ? "secondary" : "destructive"}
        size="lg"
        className="h-12 w-12 rounded-full"
        onClick={toggleAudio}
        disabled={isDisabled}
        title={localAudio ? "Tắt micro" : "Bật micro"}>
        {localAudio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </Button>

      {/* Toggle Video Button */}
      <Button
        variant={localVideo ? "secondary" : "destructive"}
        size="lg"
        className="h-12 w-12 rounded-full"
        onClick={toggleVideo}
        disabled={isDisabled}
        title={localVideo ? "Tắt camera" : "Bật camera"}>
        {localVideo ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </Button>

      {/* Leave Call Button */}
      <Button
        variant="destructive"
        size="lg"
        className="h-12 w-12 rounded-full"
        onClick={handleLeave}
        disabled={isDisabled}
        title="Rời khỏi cuộc gọi">
        <Phone className="h-5 w-5 rotate-[135deg]" />
      </Button>
    </div>
  );
}
