/**
 * VideoControls.tsx
 * Legacy controls component - no longer needed when using createFrame (iframe has built-in controls)
 * Kept for backwards compatibility
 */

import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useVideoCall } from "./useVideoCall";

interface VideoControlsProps {
  onLeave?: () => void;
  className?: string;
}

export function VideoControls({ onLeave, className }: VideoControlsProps) {
  const { callObject, leaveRoom, roomState } = useVideoCall();
  const [localVideo, setLocalVideo] = useState(false);
  const [localAudio, setLocalAudio] = useState(false);

  const handleLeave = async () => {
    await leaveRoom();
    onLeave?.();
  };

  const toggleVideo = () => {
    if (!callObject) return;
    const newState = !localVideo;
    callObject.setLocalVideo(newState);
    setLocalVideo(newState);
  };

  const toggleAudio = () => {
    if (!callObject) return;
    const newState = !localAudio;
    callObject.setLocalAudio(newState);
    setLocalAudio(newState);
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
