export const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'https://api.kdz.asia';

export const SYSTEM_TIMEOUT_MS = 3 * 60 * 1000; // 3 Minutes overall timeout for AI processing

export interface KioskEnterDtoResponse {
  aiSessionKey: string;
  durationMinutes?: number;
}

export interface Kiosk {
  id: number;
  name: string;
  location?: string;
  active?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface StaffTokenPayload {
  email?: string;
  sub?: string;
  roles?: string[];
  name?: string;
  avatarUrl?: string;
  iat?: number;
  exp?: number;
}

export interface InterviewStartResponse {
  questionContent?: string;
  phaseName?: string;
  currentQuestionIndex?: number;
  totalQuestionsInPhase?: number;
  questionType?: string;
  finished?: boolean;
}

export interface InterviewSubmitResponse {
  questionContent?: string;
  phaseName?: string;
  currentQuestionIndex?: number;
  totalQuestionsInPhase?: number;
  questionType?: string;
  finished?: boolean;
}

export interface ChatMessage {
  id: number;
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
  meta?: {
    phaseName?: string;
    questionIndex?: number;
    totalQuestions?: number;
    questionType?: string;
  };
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
}

export function resolveApiAssetUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizeVoiceOptions(payload: unknown): VoiceOption[] {
  if (Array.isArray(payload)) return payload as VoiceOption[];

  if (payload && typeof payload === 'object') {
    const data = payload as {
      voices?: unknown;
      data?: unknown;
      result?: unknown;
      content?: unknown;
    };

    if (Array.isArray(data.voices)) return data.voices as VoiceOption[];
    if (Array.isArray(data.data)) return data.data as VoiceOption[];
    if (Array.isArray(data.result)) return data.result as VoiceOption[];
    if (Array.isArray(data.content)) return data.content as VoiceOption[];
  }

  return [];
}

export async function enterKioskApi(sessionKey: string, kioskId: number): Promise<KioskEnterDtoResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SYSTEM_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/api/kiosks/enter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey, kioskId }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.message || `Xác thực Kiosk thất bại (Mã lỗi: ${res.status})`;
      throw new Error(msg);
    }

    const payload = json?.data ?? json ?? {};
    return {
      aiSessionKey: payload.aiSessionKey || sessionKey,
      durationMinutes: Number(payload.durationMinutes) || 0,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if ((err as Error)?.name === 'AbortError') {
      throw new Error('Yêu cầu hết thời gian xử lý (Timeout). Vui lòng thử lại.');
    }
    throw err;
  }
}

export async function getAvailableVoicesApi(): Promise<VoiceOption[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${BASE_URL}/api/kiosks/voices`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.message || `Không tải được danh sách giọng đọc (${res.status})`);
    }

    const rawList = normalizeVoiceOptions(json?.data ?? json);
    return rawList.map((item) => ({
      ...item,
      previewUrl: resolveApiAssetUrl(item.previewUrl || ''),
    }));
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function getAllKiosksApi(token?: string): Promise<Kiosk[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}/api/kiosks`, {
    method: 'GET',
    headers,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message || `Không tải được danh sách Kiosk (${res.status})`);
  }

  const list = json?.data ?? json ?? [];
  return Array.isArray(list) ? list : [];
}

export async function loginStaffApi(email: string, pass: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message || `Đăng nhập thất bại (${res.status})`);
  }

  const token = json?.data?.accessToken || json?.accessToken || json?.token;
  if (!token) {
    throw new Error('Máy chủ không trả về mã truy cập hợp lệ.');
  }

  return token;
}

export async function startInterviewApi(sessionKey: string): Promise<InterviewStartResponse> {
  const res = await fetch(`${BASE_URL}/api/ai-interview/start?sessionKey=${encodeURIComponent(sessionKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message || `Không thể bắt đầu phỏng vấn (${res.status})`);
  }

  return json?.data ?? json ?? {};
}

export async function submitAnswerApi(sessionKey: string, answerText: string): Promise<InterviewSubmitResponse> {
  const res = await fetch(`${BASE_URL}/api/ai-interview/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionKey, answerText }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message || `Không thể nộp câu trả lời (${res.status})`);
  }

  return json?.data ?? json ?? {};
}

export async function timeoutInterviewApi(sessionKey: string): Promise<void> {
  await fetch(`${BASE_URL}/api/ai-interview/timeout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionKey }),
  }).catch(() => {});
}

export async function generateTtsAudioApi(text: string, voiceId?: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/api/ai-interview/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message || `Không tạo được âm thanh TTS (${res.status})`);
  }

  return await res.blob();
}
