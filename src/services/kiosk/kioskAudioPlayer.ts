export interface AudioPlayerHandle {
  stop: () => void;
}

export function playAudioUri(
  uri: string,
  onEnd?: () => void,
  onError?: (err: unknown) => void
): AudioPlayerHandle {
  const audio = new Audio(uri);

  audio.onended = () => {
    onEnd?.();
  };

  audio.onerror = (e) => {
    onError?.(e);
  };

  void audio.play().catch((err) => {
    console.warn('Audio play failed:', err);
    onError?.(err);
  });

  return {
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
    },
  };
}

export async function requestMicrophonePermissionAsync(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}
