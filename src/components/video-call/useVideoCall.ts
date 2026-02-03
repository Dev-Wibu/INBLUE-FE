/**
 * useVideoCall.ts
 * Hook to use VideoCall context
 */

import { useContext } from "react";

import { VideoCallContext } from "./VideoCallContext";

/**
 * Hook to use VideoCall context
 * Must be used within VideoCallProvider
 */
export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error("useVideoCall must be used within a VideoCallProvider");
  }
  return context;
}
