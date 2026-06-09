import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { fetchClient } from "@/lib/api";
import { POST_FEED_QUERY_KEY } from "@/lib/post-feed";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import type { components } from "../../schema-from-be";

type PostResponse = components["schemas"]["PostResponse"];
type PagePostResponse = components["schemas"]["PagePostResponse"];

const DEFAULT_PAGE_SIZE = 3;

export interface UsePostFeedReturn {
  posts: PostResponse[];
  hasMore: boolean;
  isLoading: boolean;
  isReloading: boolean;
  isFetchingMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

interface UsePostFeedOptions {
  pageSize?: number;
}

export function usePostFeed(options?: UsePostFeedOptions): UsePostFeedReturn {
  const { user } = useAuthStore();
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isRefetching } =
    useInfiniteQuery({
      queryKey: [...POST_FEED_QUERY_KEY, "infinite", user?.id, pageSize],
      queryFn: async ({ pageParam = 0 }) => {
        const response = (await fetchClient.GET("/api/posts/feed", {
          params: {
            query: {
              page: pageParam,
              size: pageSize,
            },
          },
        })) as { data?: PagePostResponse; error?: unknown };

        if (response.error) {
          throw response.error;
        }

        return response.data as PagePostResponse;
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        if (lastPage.last ?? true) {
          return undefined;
        }
        const currentPage = lastPage.number ?? 0;
        return currentPage + 1;
      },
    });

  const posts = useMemo(() => {
    return data?.pages.flatMap((page) => page.content ?? []) ?? [];
  }, [data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const refresh = useCallback(() => {
    void queryClient.resetQueries({
      queryKey: [...POST_FEED_QUERY_KEY, "infinite", user?.id, pageSize],
    });
  }, [user?.id, pageSize]);

  return {
    posts,
    hasMore: !!hasNextPage,
    isLoading,
    isReloading: isRefetching && !isFetchingNextPage,
    isFetchingMore: !!isFetchingNextPage,
    loadMore,
    refresh,
  };
}
