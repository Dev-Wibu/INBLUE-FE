import { BASE_URL } from './kioskApi.service';

const TARGET_SAMPLE_RATE = 16000;
const TRANSCRIBE_PATH = '/api/v1/interview/transcribe';

export interface RealtimeTranscriptionHandle {
  stop: () => Promise<void>;
}

export interface RealtimeTranscriptionOptions {
  onTranscript: (text: string, isFinal?: boolean) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export function getRealtimeTranscriptionUrl(): string {
  return `${BASE_URL.replace(/^http/i, 'ws')}${TRANSCRIBE_PATH}`;
}

function parseTranscriptionMessage(raw: string): { type?: string; text?: string; message?: string } | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function appendTranscriptSegment(baseText: string, segment: string): string {
  return [baseText.trim(), segment.trim()].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  if (inputSampleRate === outputSampleRate) return buffer;

  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }

    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function float32ToPCM16(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i++) {
    let sample = Math.max(-1, Math.min(1, float32Array[i]));
    sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(i * 2, sample, true);
  }

  return buffer;
}

export async function startRealtimeTranscription(
  initialText: string,
  options: RealtimeTranscriptionOptions
): Promise<RealtimeTranscriptionHandle> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Trình duyệt không hỗ trợ thu âm Microphone.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
    },
  });

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioCtx();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  const socket = new WebSocket(getRealtimeTranscriptionUrl());
  socket.binaryType = 'arraybuffer';

  let currentTranscript = initialText.trim();
  let isClosed = false;
  let stopResolve: (() => void) | null = null;

  const emitTranscript = (text: string, isFinal = false) => {
    currentTranscript = text.trim();
    options.onTranscript(currentTranscript, isFinal);
  };

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;

    try {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      if (audioContext.state !== 'closed') {
        void audioContext.close();
      }
    } catch (err) {
      console.warn('Cleanup audio warning:', err);
    }

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      try {
        socket.close();
      } catch {}
    }

    options.onClose?.();
    if (stopResolve) {
      stopResolve();
      stopResolve = null;
    }
  };

  socket.onopen = () => {
    options.onReady?.();
  };

  socket.onmessage = (event) => {
    if (typeof event.data !== 'string') return;
    const msg = parseTranscriptionMessage(event.data);
    if (!msg) return;

    if (msg.type === 'transcript' || msg.text) {
      const seg = msg.text || msg.message || '';
      if (seg) {
        emitTranscript(appendTranscriptSegment(initialText, seg), false);
      }
    } else if (msg.type === 'turn_complete' || msg.type === 'final') {
      const seg = msg.text || msg.message || '';
      const finalText = seg ? appendTranscriptSegment(initialText, seg) : currentTranscript;
      emitTranscript(finalText, true);
      if (stopResolve) {
        stopResolve();
        stopResolve = null;
      }
    }
  };

  socket.onerror = () => {
    options.onError?.(new Error('Lỗi kết nối WebSocket phiên âm thời gian thực.'));
  };

  socket.onclose = () => {
    cleanup();
  };

  processor.onaudioprocess = (event) => {
    if (socket.readyState !== WebSocket.OPEN) return;

    const inputData = event.inputBuffer.getChannelData(0);
    const downsampled = downsampleBuffer(inputData, audioContext.sampleRate, TARGET_SAMPLE_RATE);
    const pcm16 = float32ToPCM16(downsampled);

    try {
      socket.send(pcm16);
    } catch {}
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    stop: async () => {
      if (isClosed) return;
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: 'stop' }));
        } catch {}
      }

      await new Promise<void>((resolve) => {
        stopResolve = resolve;
        setTimeout(() => {
          if (stopResolve) {
            stopResolve();
            stopResolve = null;
          }
        }, 1200);
      });

      cleanup();
    },
  };
}
