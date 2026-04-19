import type { ApiError } from "@/interfaces";

const DEFAULT_FALLBACK_MESSAGE = "Đã xảy ra lỗi. Vui lòng thử lại.";

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  401: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu yêu cầu.",
  409: "Dữ liệu bị xung đột. Vui lòng thử lại.",
  413: "Tập tin quá lớn. Vui lòng chọn file nhỏ hơn.",
  415: "Định dạng dữ liệu không được hỗ trợ.",
  422: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  429: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
  500: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
  502: "Máy chủ tạm thời không khả dụng.",
  503: "Dịch vụ đang bảo trì. Vui lòng thử lại sau.",
  504: "Máy chủ phản hồi quá chậm. Vui lòng thử lại.",
};

const GENERIC_MESSAGES = new Set([
  "internal server error",
  "request failed with status code 400",
  "request failed with status code 401",
  "request failed with status code 403",
  "request failed with status code 404",
  "request failed with status code 409",
  "request failed with status code 413",
  "request failed with status code 415",
  "request failed with status code 422",
  "request failed with status code 429",
  "request failed with status code 500",
  "request failed with status code 502",
  "request failed with status code 503",
  "request failed with status code 504",
  "network error",
]);

const KNOWN_ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /(bad credentials|invalid password|wrong password)/i,
    message: "Sai mật khẩu.",
  },
  {
    pattern: /(user not found|not found with email|email không tồn tại|email khong ton tai)/i,
    message: "Sai email.",
  },
  {
    pattern: /(email đã tồn tại|email da ton tai|email already exists|email exists)/i,
    message: "Email đã tồn tại.",
  },
  {
    pattern: /(insufficient balance|số dư.*không đủ|so du.*khong du)/i,
    message: "Số dư ví không đủ. Vui lòng nạp thêm tiền hoặc chọn phương thức khác.",
  },
  {
    pattern: /(no enum constant|json parse error|cannot deserialize|cannot map `null`)/i,
    message: "Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.",
  },
  {
    pattern: /(content-type .* is not supported|unsupported media type)/i,
    message: "Định dạng dữ liệu gửi lên không được hỗ trợ.",
  },
  {
    pattern: /(session not found)/i,
    message: "Không tìm thấy phiên phỏng vấn.",
  },
  {
    pattern: /(timed out|timeout)/i,
    message: "Yêu cầu quá thời gian chờ. Vui lòng thử lại.",
  },
];

type ErrorSource = "axios" | "fetch" | "native" | "unknown";

export interface NormalizedApiError extends ApiError {
  traceId?: string;
  rawMessage?: string;
  source: ErrorSource;
  fieldErrors?: Record<string, string>;
  payload?: unknown;
}

export type AppApiError = Error & {
  status?: number;
  code?: string;
  traceId?: string;
  rawMessage?: string;
  source?: ErrorSource;
  fieldErrors?: Record<string, string>;
  payload?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const asNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const asFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return undefined;
};

const parseMaybeJsonString = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
};

const normalizeFieldErrors = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const normalized = Object.entries(value).reduce<Record<string, string>>((acc, [key, item]) => {
    const singleMessage = asNonEmptyString(item);
    if (singleMessage) {
      acc[key] = singleMessage;
      return acc;
    }

    if (Array.isArray(item)) {
      const firstMessage = item.find(
        (entry) => typeof entry === "string" && entry.trim().length > 0
      );
      if (typeof firstMessage === "string") {
        acc[key] = firstMessage.trim();
      }
    }

    return acc;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const extractMessageFromPayload = (payload: unknown, depth = 0): string | undefined => {
  if (depth > 4 || payload === null || payload === undefined) {
    return undefined;
  }

  if (typeof payload === "string") {
    const parsed = parseMaybeJsonString(payload);
    if (parsed !== payload) {
      return extractMessageFromPayload(parsed, depth + 1);
    }

    return asNonEmptyString(payload);
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const extracted = extractMessageFromPayload(item, depth + 1);
      if (extracted) {
        return extracted;
      }
    }

    return undefined;
  }

  if (!isRecord(payload)) {
    return undefined;
  }

  const directMessage =
    asNonEmptyString(payload.message) ||
    asNonEmptyString(payload.error) ||
    asNonEmptyString(payload.detail) ||
    asNonEmptyString(payload.title) ||
    asNonEmptyString(payload.msg) ||
    asNonEmptyString(payload.reason) ||
    asNonEmptyString(payload.description);

  if (directMessage) {
    return directMessage;
  }

  if (payload.data !== undefined) {
    const nestedMessage = extractMessageFromPayload(payload.data, depth + 1);
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  if (payload.errors !== undefined) {
    const fieldErrors = normalizeFieldErrors(payload.errors);
    if (fieldErrors) {
      const firstKey = Object.keys(fieldErrors)[0];
      if (firstKey) {
        return fieldErrors[firstKey];
      }
    }
  }

  if (payload.fieldErrors !== undefined) {
    const fieldErrors = normalizeFieldErrors(payload.fieldErrors);
    if (fieldErrors) {
      const firstKey = Object.keys(fieldErrors)[0];
      if (firstKey) {
        return fieldErrors[firstKey];
      }
    }
  }

  return undefined;
};

const extractPayload = (error: unknown): { payload: unknown; source: ErrorSource } => {
  if (isRecord(error) && isRecord(error.response)) {
    const response = error.response;
    return {
      payload: response.data,
      source: "axios",
    };
  }

  if (isRecord(error) && "data" in error) {
    return {
      payload: (error as Record<string, unknown>).data,
      source: "fetch",
    };
  }

  if (error instanceof Error) {
    return {
      payload: error.message,
      source: "native",
    };
  }

  return {
    payload: error,
    source: "unknown",
  };
};

const extractStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }

  const directStatus = asFiniteNumber(error.status) ?? asFiniteNumber(error.statusCode);
  if (directStatus) {
    return directStatus;
  }

  if (isRecord(error.response)) {
    const responseStatus =
      asFiniteNumber(error.response.status) ?? asFiniteNumber(error.response.statusCode);
    if (responseStatus) {
      return responseStatus;
    }
  }

  if (isRecord(error.data)) {
    const dataStatus = asFiniteNumber(error.data.status) ?? asFiniteNumber(error.data.statusCode);
    if (dataStatus) {
      return dataStatus;
    }
  }

  return undefined;
};

const extractTraceId = (error: unknown, payload: unknown): string | undefined => {
  if (isRecord(payload)) {
    const payloadTraceId = asNonEmptyString(payload.traceId) || asNonEmptyString(payload.traceID);
    if (payloadTraceId) {
      return payloadTraceId;
    }
  }

  if (!isRecord(error)) {
    return undefined;
  }

  if (isRecord(error.response) && isRecord(error.response.data)) {
    return (
      asNonEmptyString(error.response.data.traceId) || asNonEmptyString(error.response.data.traceID)
    );
  }

  return asNonEmptyString(error.traceId) || asNonEmptyString(error.traceID);
};

const extractCode = (error: unknown, payload: unknown): string | undefined => {
  if (isRecord(payload)) {
    const payloadCode =
      asNonEmptyString(payload.code) ||
      asNonEmptyString(payload.errorCode) ||
      asNonEmptyString(payload.error_code);
    if (payloadCode) {
      return payloadCode;
    }
  }

  if (!isRecord(error)) {
    return undefined;
  }

  return asNonEmptyString(error.code);
};

const extractFieldErrors = (payload: unknown): Record<string, string> | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  return normalizeFieldErrors(payload.fieldErrors) || normalizeFieldErrors(payload.errors);
};

const mapKnownMessage = (rawMessage?: string): string | undefined => {
  if (!rawMessage) {
    return undefined;
  }

  for (const rule of KNOWN_ERROR_PATTERNS) {
    if (rule.pattern.test(rawMessage)) {
      return rule.message;
    }
  }

  return undefined;
};

const isGenericRawMessage = (rawMessage?: string): boolean => {
  if (!rawMessage) {
    return true;
  }

  return GENERIC_MESSAGES.has(rawMessage.trim().toLowerCase());
};

export const resolveStatusErrorMessage = (status?: number): string | undefined => {
  if (!status) {
    return undefined;
  }

  return HTTP_STATUS_MESSAGES[status];
};

export const normalizeApiError = (
  error: unknown,
  fallbackMessage = DEFAULT_FALLBACK_MESSAGE
): NormalizedApiError => {
  const { payload, source } = extractPayload(error);
  const status = extractStatus(error);
  const traceId = extractTraceId(error, payload);
  const code = extractCode(error, payload);
  const fieldErrors = extractFieldErrors(payload);
  const rawMessage = extractMessageFromPayload(payload) || extractMessageFromPayload(error);

  const knownMessage = mapKnownMessage(rawMessage);
  const statusMessage = resolveStatusErrorMessage(status);

  let message = fallbackMessage;

  if (knownMessage) {
    message = knownMessage;
  } else if (rawMessage && !isGenericRawMessage(rawMessage)) {
    message = rawMessage;
  } else if (statusMessage) {
    message = statusMessage;
  }

  return {
    message,
    rawMessage,
    status,
    code,
    traceId,
    fieldErrors,
    details: payload,
    source,
    payload,
  };
};

export const getNormalizedErrorMessage = (error: unknown, fallbackMessage?: string): string => {
  return normalizeApiError(error, fallbackMessage).message;
};

export const toAppApiError = (
  error: unknown,
  fallbackMessage = DEFAULT_FALLBACK_MESSAGE
): AppApiError => {
  const normalized = normalizeApiError(error, fallbackMessage);
  const appError = new Error(normalized.message) as AppApiError;
  appError.status = normalized.status;
  appError.code = normalized.code;
  appError.traceId = normalized.traceId;
  appError.rawMessage = normalized.rawMessage;
  appError.source = normalized.source;
  appError.fieldErrors = normalized.fieldErrors;
  appError.payload = normalized.payload;
  return appError;
};
