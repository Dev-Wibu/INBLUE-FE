import { useEffect, useRef, useState } from "react";

import { useNewFeed } from "@/services/post.manager";
import type { components } from "../../../../schema-from-be";

type PostResponse = components["schemas"]["PostResponse"];
type PagePostResponse = components["schemas"]["PagePostResponse"];

const PAGE_SIZE = 3;

export interface UseHomeFeedReturn {
  posts: PostResponse[];
  hasMore: boolean;
  isLoading: boolean;
  isFetchingMore: boolean;
  loadMore: () => void;
}

export function useHomeFeed(): UseHomeFeedReturn {
  const [page, setPage] = useState(0);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const appendedPages = useRef<Set<number>>(new Set());

  const { data, isLoading, isFetching } = useNewFeed({ page, size: PAGE_SIZE });

  // Append new page data when response arrives
  // Using ref to deduplicate avoids infinite effect loops
  useEffect(() => {
    if (!data) return;
    const content = data as unknown as PagePostResponse;
    const pageIndex = content.number ?? page;

    if (!appendedPages.current.has(pageIndex)) {
      appendedPages.current.add(pageIndex);
      const incoming = content.content ?? [];
      // Batch both state updates to a single re-render via functional form
      setPosts((prev) => [...prev, ...incoming]);
      setHasMore(!(content.last ?? true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const loadMore = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  return {
    posts,
    hasMore,
    isLoading: isLoading && posts.length === 0,
    isFetchingMore: isFetching && posts.length > 0,
    loadMore,
  };
}
