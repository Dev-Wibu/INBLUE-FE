import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Type-safe API Client using openapi-fetch and openapi-react-query
 * Based on schema-from-be.d.ts
 */

import type { paths } from "../../schema-from-be";

import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";

import { API_BASE_URL, isPublicAuthRequest, isSilent401Endpoint } from "@/constants/api.config";
import { normalizeApiError, toAppApiError } from "@/lib/error-normalizer";

// Create the fetch client with base configuration
const fetchClient = createFetchClient<paths>({
  baseUrl: API_BASE_URL,
  // Provide a custom fetch implementation to add a global 90s timeout
  // This is especially important for slow AI API responses
  fetch: async (request: Request) => {
    // If a request doesn't provide its own abort signal, add a 90s timeout signal
    let signal = request.signal;
    if (!signal && typeof AbortSignal.timeout === "function") {
      signal = AbortSignal.timeout(90000); // 90 seconds
    }
    const newRequest = new Request(request, { signal });
    return fetch(newRequest);
  },
});

// Add middleware to include the JWT token and normalize API responses.
fetchClient.use({
  async onRequest({ request }) {
    // Dynamically import to avoid circular dependency
    const { useAuthStore } = await import("@/stores/authStore");
    const token = useAuthStore.getState().token;
    const shouldSkipAuthHeader = isPublicAuthRequest(request.url, request.method);

    if (token && !shouldSkipAuthHeader) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }

    // Preserve request correlation without exposing request data in the browser console.
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    request.headers.set("X-Request-ID", requestId);

    return request;
  },
  async onResponse({ request, response }) {
    let finalResponse = response;
    let payload: unknown;
    let hasJson = false;

    // Detect and parse JSON body
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        const clonedForParse = response.clone();
        payload = await clonedForParse.json();
        hasJson = true;
      } catch {
        // Failed to parse JSON
      }
    }

    if (response.ok) {
      if (hasJson && payload && typeof payload === "object") {
        if ("traceId" in (payload as Record<string, unknown>)) {
          const record = payload as Record<string, unknown>;
          let unwrappedPayload: unknown = payload;
          const keys = Object.keys(record);

          if (
            keys.includes("data") &&
            (keys.length === 2 || (keys.length === 1 && !keys.includes("traceId")))
          ) {
            unwrappedPayload = record["data"];
          } else {
            unwrappedPayload = Object.fromEntries(
              Object.entries(record).filter(([k]) => k !== "traceId")
            );
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.delete("content-length");
          const newResponse = new Response(JSON.stringify(unwrappedPayload), {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
          Object.defineProperty(newResponse, "url", { value: response.url });
          finalResponse = newResponse;

          // Use the unwrapped payload for subsequent processing.
          payload = unwrappedPayload;
        }
      }
    } else {
      // Failed response handling
      if (!hasJson) {
        try {
          payload = await response.clone().text();
        } catch {
          payload = undefined;
        }
      }

      const errorDescriptor = {
        status: response.status,
        data: payload,
      };

      const normalizedError = normalizeApiError(
        errorDescriptor,
        t("general.anErrorOccurredWhileCalling")
      );

      // Auto-logout on 401 (token expired or invalid)
      if (response.status === 401) {
        const requestUrl = request.url;
        const requestMethod = request.method;
        const shouldSkipRedirect = isPublicAuthRequest(requestUrl, requestMethod);
        const shouldSilentFail = isSilent401Endpoint(requestUrl, requestMethod);
        const isPostsEndpoint =
          requestUrl.includes("/posts") && requestMethod.toLowerCase() === "get";

        if (!shouldSkipRedirect && !shouldSilentFail && !isPostsEndpoint) {
          const { useAuthStore } = await import("@/stores/authStore");
          useAuthStore.getState().clearAuth();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }

      // Throw a normalized AppApiError so that openapi-react-query (React Query)
      // receives the same error shape as the Axios interceptor.
      // This unifies error handling across both API clients.
      throw toAppApiError(errorDescriptor, normalizedError.message);
    }

    return finalResponse;
  },
});

// Create the React Query client
export const $api = createClient(fetchClient);

// Export the fetch client for direct use if needed
export { fetchClient };
