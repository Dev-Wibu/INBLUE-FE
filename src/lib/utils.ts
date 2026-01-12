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
