import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { ApiResponse, PaginatedResponse } from "@/interfaces";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts array data from an ApiResponse that may contain either
 * a direct array or a PaginatedResponse with a data property.
 *
 * @param response - The ApiResponse to extract data from
 * @returns Array of items, or empty array if extraction fails
 */
export function extractDataArray<T>(response: ApiResponse<PaginatedResponse<T> | T[]>): T[] {
  if (!response.success || !response.data) {
    return [];
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  // Handle PaginatedResponse
  if ("data" in response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }

  return [];
}

/**
 * Formats a Date object to Vietnam timezone ISO-like string.
 * Example: 2026-02-24T10:30:00
 */
export function formatToVietnamISOString(date: Date): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value || "00";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * Converts datetime-local value (yyyy-MM-ddTHH:mm or yyyy-MM-ddTHH:mm:ss)
 * to Vietnam timezone string.
 */
export function datetimeLocalToVietnamISOString(value: string): string {
  const withoutTimezone = value.replace(/([zZ]|[+-]\d{2}:\d{2})$/, "");
  const withSeconds = withoutTimezone.length === 16 ? `${withoutTimezone}:00` : withoutTimezone;
  return `${withSeconds}`;
}

/**
 * Attempts to fix common UTF-8 mojibake caused by double-encoding.
 * E.g. "Nguyá»…n" (UTF-8 bytes decoded as Latin-1) → "Nguyễn"
 *
 * Strategy: try multiple interpretations and pick the one that produces
 * the most Vietnamese characters.
 */
export function fixUtf8Mojibake(value: unknown): string {
  if (value == null) return "";
  const str = String(value);

  // Common Vietnamese characters - used to score candidates.
  const VIETNAMESE_CHARS =
    /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/;
  const countVietnamese = (s: string): number => {
    let count = 0;
    for (const ch of s) {
      if (VIETNAMESE_CHARS.test(ch)) count++;
    }
    return count;
  };

  // Fast path: if string is already clean Vietnamese, skip processing.
  // "Suspicious" if it has high-byte Latin-1 chars next to other high-byte chars,
  // or contains common mojibake chars like ¡, ¢, £, ¤, ¥, §, ¨, ©, ª, «, ¬, ®, ¯, °, ±, ², ³, ¶, ·, ¸, ¹, º, », ¼, ½, ¾, ¿, ×, ÷.
  const hasMojibakeIndicator = /á»|áº|Ä|Ã|Å|â€/.test(str);
  if (!hasMojibakeIndicator) {
    return str;
  }

  // Helper: decode a string treated as Latin-1 byte values, then attempt UTF-8.
  const decodeAsUtf8 = (input: string): string => {
    try {
      const codes: number[] = [];
      for (let i = 0; i < input.length; i++) {
        codes.push(input.charCodeAt(i) & 0xff);
      }
      const bytes = new Uint8Array(codes);
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      return decoded.replace(/\uFFFD/g, "");
    } catch {
      return input;
    }
  };

  // Strategy 1: Latin-1 -> UTF-8
  const candidate1 = decodeAsUtf8(str);
  // Strategy 2: Windows-1252 -> UTF-8
  let candidate2 = str;
  try {
    const codes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      codes.push(str.charCodeAt(i) & 0xff);
    }
    const bytes = new Uint8Array(codes);
    candidate2 = new TextDecoder("windows-1252").decode(bytes);
    // Now try UTF-8 on that
    candidate2 = decodeAsUtf8(candidate2);
  } catch {
    candidate2 = str;
  }

  // Choose the best candidate (most Vietnamese characters).
  const cands = [str, candidate1, candidate2];
  let best = str;
  let bestScore = countVietnamese(str);
  for (const cand of cands) {
    if (!cand) continue;
    const score = countVietnamese(cand);
    if (score > bestScore) {
      best = cand;
      bestScore = score;
    }
  }

  return best;
}
