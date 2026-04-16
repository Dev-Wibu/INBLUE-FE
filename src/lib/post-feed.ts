import { queryClient } from "@/lib/queryClient";

export const POST_FEED_QUERY_KEY = ["get", "/api/posts/feed"] as const;

export const getPostDetailQueryKey = (postId: number) =>
  ["get", "/api/posts/{postId}", { params: { path: { postId } } }] as const;

export const invalidatePostFeedQueries = (postId?: number) => {
  queryClient.invalidateQueries({ queryKey: POST_FEED_QUERY_KEY });
  if (typeof postId === "number" && postId > 0) {
    queryClient.invalidateQueries({ queryKey: getPostDetailQueryKey(postId) });
  }
};
