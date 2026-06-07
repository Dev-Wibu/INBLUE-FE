import { useCallback, useEffect, useRef, useState } from "react";

import { invalidatePostFeedQueries } from "@/lib/post-feed";
import { useNewFeed } from "@/services/post.manager";
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

  const [page, setPage] = useState(0);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const appendedPages = useRef<Set<number>>(new Set());
  const pendingRefreshRef = useRef(false);
  const prevUserId = useRef(user?.id);

  useEffect(() => {
    if (prevUserId.current !== user?.id) {
      prevUserId.current = user?.id;
      appendedPages.current.clear();
      // Resetting accumulated feed state when user identity changes is intentional
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPosts([]);
      setPage(0);
      setHasMore(true);
      invalidatePostFeedQueries();
    }
  }, [user?.id]);

  const { data, isLoading, isFetching } = useNewFeed({ page, size: pageSize });

  useEffect(() => {
    if (!data) return;
    const content = data as unknown as PagePostResponse;
    // Use server-returned page index as source of truth; fall back to 0 if absent
    const pageIndex = content.number ?? 0;
    const incoming = content.content ?? [];

    if (pendingRefreshRef.current && pageIndex === 0) {
      appendedPages.current.clear();
      appendedPages.current.add(0);
      // Accumulating paginated feed data from React Query response is intentional
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPosts(incoming);
      setHasMore(!(content.last ?? true));
      pendingRefreshRef.current = false;
      setIsReloading(false);
      return;
    }

    if (!appendedPages.current.has(pageIndex)) {
      appendedPages.current.add(pageIndex);
      setPosts((prev) => [...prev, ...incoming]);
      setHasMore(!(content.last ?? true));
    }
  }, [data]);

  useEffect(() => {
    if (!isFetching && pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      // Clearing reload flag once React Query finishes fetching is intentional
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReloading(false);
    }
  }, [isFetching]);

  const loadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const refresh = useCallback(() => {
    pendingRefreshRef.current = true;
    setIsReloading(true);
    setPage(0);
    setHasMore(true);
    invalidatePostFeedQueries();
  }, []);

  return {
    posts,
    hasMore,
    isLoading: isLoading && posts.length === 0,
    isReloading,
    isFetchingMore: isFetching && posts.length > 0,
    loadMore,
    refresh,
  };
}
