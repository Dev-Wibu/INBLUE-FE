import { Heart, MessageCircle } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/formatting";
import { useCheckLiked, usePostLikesCount } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";
import type { components } from "../../../../../schema-from-be";

import { LikeButton } from "../../Community/components/LikeButton";
import { PostFeedModal } from "./PostFeedModal";

type PostResponse = components["schemas"]["PostResponse"];

interface PostFeedCardProps {
  item: PostResponse;
}

export function PostFeedCard({ item }: PostFeedCardProps) {
  const { user } = useAuthStore();
  const post = item.post;
  const postId = post?.postId ?? 0;

  // Feed API already returns commentCount — no extra round-trip needed
  const commentCount = item.commentCount ?? 0;

  // Use live query cache so count bar updates immediately after like toggle
  const { data: likedData } = useCheckLiked(postId, user?.id ?? 0, !!user?.id && postId > 0);
  const { data: countData } = usePostLikesCount(postId);

  // checkLiked returns { [key: string]: boolean } — extract the first value
  const isLiked = Object.values((likedData ?? {}) as Record<string, boolean>)[0] ?? false;
  const likeCount = (countData as unknown as number) ?? item.likeCount ?? 0;

  const [modalOpen, setModalOpen] = useState(false);

  const authorName = post?.author?.name ?? "Ẩn danh";
  const authorInitials = authorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Facebook-style like count label
  const likeLabel = (() => {
    if (likeCount === 0) return null;
    if (isLiked && likeCount === 1) return "Bạn";
    if (isLiked) return `Bạn và ${likeCount - 1} người khác`;
    return `${likeCount}`;
  })();

  return (
    <>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        {/* Author + major + date + title */}
        <CardHeader className="pt-4 pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={post?.author?.avatar} alt={authorName} />
              <AvatarFallback className="bg-[#0047AB]/10 text-sm font-semibold text-[#0047AB]">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{authorName}</span>
                {post?.majorName && (
                  <Badge
                    variant="secondary"
                    className="bg-[#DCEEFF] text-xs text-[#0047AB] dark:bg-[#0047AB]/20 dark:text-[#66B2FF]">
                    {post.majorName}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">{formatDate(post?.creationDate)}</p>
            </div>
          </div>

          {/* Title */}
          <button
            type="button"
            className="mt-2 block w-full text-left"
            onClick={() => setModalOpen(true)}>
            <h3 className="line-clamp-2 text-base font-semibold hover:text-[#0047AB] dark:hover:text-[#66B2FF]">
              {post?.title}
            </h3>
          </button>
        </CardHeader>

        {/* Summary + Content + Tags */}
        <CardContent className="pb-2">
          {post?.summary && (
            <p className="text-muted-foreground line-clamp-3 text-sm">{post.summary}</p>
          )}
          {post?.content && post.content !== post?.summary && (
            <p className="text-muted-foreground mt-1 line-clamp-4 text-sm">{post.content}</p>
          )}
        </CardContent>

        {/* Cover image (after text — text-first layout) */}
        {post?.coverImgUrl && (
          <div
            className="aspect-video w-full cursor-pointer overflow-hidden"
            onClick={() => setModalOpen(true)}>
            <img
              src={post.coverImgUrl}
              alt={post.title ?? ""}
              className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
            />
          </div>
        )}
        {(post?.tags?.length ?? 0) > 0 && (
          <div className="ml-3 flex flex-wrap gap-1.5">
            {post!.tags!.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs text-slate-500">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        {/* Like/comment count bar (Facebook-style) */}
        {(likeLabel || commentCount > 0) && (
          <div className="flex items-center gap-1 px-4 pt-2 pb-1">
            {likeLabel && (
              <>
                <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                <span className="text-muted-foreground text-xs">{likeLabel}</span>
              </>
            )}
            {commentCount > 0 && (
              <span className="text-muted-foreground ml-auto text-xs">
                {commentCount} bình luận
              </span>
            )}
          </div>
        )}

        <Separator className="mx-4" />

        {/* Action row */}
        <CardFooter className="flex items-center gap-1 pt-1 pb-2">
          {user?.id && postId > 0 ? (
            <LikeButton postId={postId} userId={user.id} showLabel />
          ) : (
            <span className="text-muted-foreground flex-1 text-center text-sm">Thích</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-center gap-1.5"
            onClick={() => setModalOpen(true)}>
            <MessageCircle className="h-4 w-4" />
            <span>Bình luận</span>
          </Button>
        </CardFooter>
      </Card>

      <PostFeedModal item={item} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
