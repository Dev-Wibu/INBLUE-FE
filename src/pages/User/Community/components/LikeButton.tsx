import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import {
  useCheckLiked,
  useLikePost,
  usePostLikesCount,
  useUnlikePost,
} from "@/services/post.manager";

interface LikeButtonProps {
  postId: number;
  userId: number;
  /** When true renders "Thích" label (action bar style); when false renders numeric count */
  showLabel?: boolean;
  onLikeChange?: (liked: boolean) => void;
}

export function LikeButton({ postId, userId, showLabel = false, onLikeChange }: LikeButtonProps) {
  const { data: likedData } = useCheckLiked(postId, userId);
  const { data: countData } = usePostLikesCount(postId);
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();

  // checkLiked returns { [key: string]: boolean } — e.g. { "liked": false }
  // Casting the object directly as boolean would always be truthy, so extract the first value
  const liked = Object.values((likedData ?? {}) as Record<string, boolean>)[0] ?? false;
  const count = (countData as unknown as number) ?? 0;

  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);

  const isLiked = optimisticLiked !== null ? optimisticLiked : liked;
  const likeCount = optimisticCount !== null ? optimisticCount : count;

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/api/posts/likes/{postId}/check/{userId}",
        { params: { path: { postId, userId } } },
      ],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/api/posts/likes/{postId}/count", { params: { path: { postId } } }],
    });
  };

  const handleToggle = () => {
    if (isLiked) {
      setOptimisticLiked(false);
      setOptimisticCount(Math.max(0, likeCount - 1));
      unlikeMutation.mutate({ params: { path: { postId, userId } } } as never, {
        onSuccess: () => {
          invalidateQueries();
          setOptimisticLiked(null);
          setOptimisticCount(null);
          onLikeChange?.(false);
        },
        onError: () => {
          setOptimisticLiked(null);
          setOptimisticCount(null);
          toast.error("Không thể bỏ thích bài viết");
        },
      });
    } else {
      setOptimisticLiked(true);
      setOptimisticCount(likeCount + 1);
      likeMutation.mutate({ body: { postId, userId } } as never, {
        onSuccess: () => {
          invalidateQueries();
          setOptimisticLiked(null);
          setOptimisticCount(null);
          onLikeChange?.(true);
        },
        onError: () => {
          setOptimisticLiked(null);
          setOptimisticCount(null);
          toast.error("Không thể thích bài viết");
        },
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        handleToggle();
      }}
      className={`gap-1.5 ${showLabel ? "flex-1 justify-center" : ""} ${isLiked ? "text-red-500 hover:text-red-600" : ""}`}>
      <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
      {showLabel ? <span>Thích</span> : <span>{likeCount}</span>}
    </Button>
  );
}
