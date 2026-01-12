import { QueryClient } from "@tanstack/react-query";

// Create a client with optimized default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests up to 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't refetch on window focus by default (can be overridden per query)
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Only retry mutations once (they often have side effects)
      retry: 1,
    },
  },
});
