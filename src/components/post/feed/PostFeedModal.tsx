import { MediaLightboxDialog } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/formatting";
import { invalidatePostFeedQueries } from "@/lib/post-feed";
import { useCheckLiked, useCreateComment, usePostById } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";
import { Heart, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../schema-from-be";
import { CommentSection } from "../CommentSection";
import { LikeButton } from "../LikeButton";
import { LikeListModal } from "../LikeListModal";

type PostResponse = components["schemas"]["PostResponse"];
type PostLikeResponse = components["schemas"]["PostLikeResponse"];
type PostCommentResponse = components["schemas"]["PostCommentResponse"];

interface PostFeedModalProps {
  item: PostResponse;
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onCommentCountChange?: (_count: number) => void;
}

export function PostFeedModal({
  item,
  open,
  onOpenChange,
  onCommentCountChange,
}: PostFeedModalProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const post = item.post;
  const postId = post?.postId ?? 0;
  const [likeModalOpen, setLikeModalOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const createComment = useCreateComment();

  // Only fetch live data when user is logged in
  const shouldFetchLive = !!user?.id;
  const { data: liveRaw } = usePostById(postId, shouldFetchLive);
  const live = liveRaw as unknown as PostResponse | undefined;

  // Only check liked status when user is logged in
  const { data: likedData } = useCheckLiked(postId, user?.id ?? 0, !!user?.id);

  const handlePostModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && imageViewerOpen) {
      return;
    }
    onOpenChange(nextOpen);
  };

  const invalidateLivePost = () => {
    invalidatePostFeedQueries(postId);
  };

  const handleCommentSubmit = () => {
    const content = newComment.trim();
    if (!content || !user?.id) return;

    createComment.mutate(
      {
        body: {
          postId,
          content,
          parentCommentId: null,
        },
      } as never,
      {
        onSuccess: () => {
          setNewComment("");
          invalidateLivePost();
          onCommentCountChange?.((liveCommentCount ?? 0) + 1);
        },
        onError: () => toast.error(t("compPost.cannotPostComments", "Không thể gửi bình luận")),
      }
    );
  };

  const rawLiked =
    typeof likedData === "boolean"
      ? likedData
      : (Object.values(likedData ?? {})[0] as string | boolean | undefined);
  const isLiked = rawLiked === true || rawLiked === "true";
  const likeCount = live?.likeCount ?? item.likeCount ?? 0;

  // Synchronized list of users who liked the post
  const rawLikers = ((live?.postLikes ?? item.postLikes ?? []) as PostLikeResponse[]).filter(
    (l): l is PostLikeResponse & { userName: string } => !!l.userName
  );
  const likers = [...rawLikers];
  if (isLiked && user?.name) {
    if (!likers.some((l) => l.userName === user.name)) {
      likers.unshift({
        userName: user.name,
        userAvatar: user.avatarUrl ?? "",
      });
    }
  } else if (!isLiked && user?.name) {
    const idx = likers.findIndex((l) => l.userName === user.name);
    if (idx !== -1) {
      likers.splice(idx, 1);
    }
  }

  const showSuffix = likeCount > 10;
  const displayLikers = showSuffix ? likers.slice(0, 9) : likers.slice(0, 10);
  const extraCount = Math.max(0, likeCount - displayLikers.length);
  const liveCommentCount = live?.commentCount ?? item.commentCount ?? 0;
  const postComments = (live?.postComments ?? item.postComments ?? []) as PostCommentResponse[];

  const authorName = post?.author?.name ?? t("common.anonymous", "Vô danh");
  const authorInitials = authorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const likeLabel = (() => {
    if (likeCount === 0) return null;
    if (isLiked && likeCount === 1) return t("common.friend", "Bạn");
    if (isLiked)
      return t("general.youAndOthers", {
        var_0: likeCount - 1,
      });
    return `${likeCount}`;
  })();

  const coverMediaItems = post?.coverImgUrl
    ? [
        {
          id: `post-cover-${postId}`,
          name: post.title ?? t("compPost.articlePhoto", "Ảnh bài viết"),
          src: post.coverImgUrl,
          alt: post.title ?? t("compPost.articlePhoto", "Ảnh bài viết"),
          kind: "image" as const,
          requireAuth: false,
        },
      ]
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={handlePostModalOpenChange}>
        <DialogContent
          className="flex h-[90vh] max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          onEscapeKeyDown={(event) => {
            if (imageViewerOpen) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (imageViewerOpen) {
              event.preventDefault();
            }
          }}>
          {/* Header - Author Info Header */}
          <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-slate-100 dark:ring-slate-800">
                <AvatarImage src={post?.author?.avatar} alt={authorName} />
                <AvatarFallback className="bg-indigo-600/10 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {authorName}
                  </DialogTitle>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(post as any)?.majorName && (
                    <Badge
                      variant="secondary"
                      className="border-0 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-300">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(post as any).majorName}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {formatDateTime(post?.creationDate)}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Article Canvas - Scrollable Body */}
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
            {/* Article Main Title */}
            <h1 className="text-2xl leading-snug font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {post?.title}
            </h1>

            {/* Article Summary Callout */}
            {post?.summary && (
              <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50/50 p-4 dark:border-indigo-500 dark:bg-indigo-950/30">
                <p className="text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                  {post.summary}
                </p>
              </div>
            )}

            {/* Article Full Content */}
            {post?.content && (
              <div className="space-y-4 pt-1">
                <p className="text-base leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                  {post.content}
                </p>
              </div>
            )}

            {/* Cover Image - Placed Below Text Content */}
            {post?.coverImgUrl && (
              <div
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-800"
                onClick={() => setImageViewerOpen(true)}>
                <img
                  src={post.coverImgUrl}
                  alt={post.title ?? ""}
                  className="max-h-[420px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded-full bg-slate-950/70 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                    {t("common.clickToEnlarge", "Bấm để phóng to")}
                  </span>
                </div>
              </div>
            )}

            {/* Tags */}
            {(post?.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {post!.tags!.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="rounded-md border-0 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Like and Comment Counts */}
            {(likeLabel || liveCommentCount > 0) && (
              <div className="flex items-center justify-between border-t border-b border-slate-100 py-3 dark:border-slate-800">
                {likeLabel ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                          type="button"
                          onClick={() => setLikeModalOpen(true)}>
                          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                          <span>{likeLabel}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="z-50 max-w-xs rounded-lg border-slate-800 bg-slate-900 p-2.5 text-slate-50 shadow-xl">
                        <div className="space-y-1.5">
                          {displayLikers.map((liker) => (
                            <div key={liker.userName} className="flex items-center gap-2">
                              <Avatar className="h-5 w-5 ring-1 ring-slate-700/50">
                                <AvatarImage src={liker.userAvatar} alt={liker.userName} />
                                <AvatarFallback className="bg-indigo-600/20 text-[10px] font-bold text-indigo-400">
                                  {(liker.userName ?? "").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate text-xs font-medium">{liker.userName}</span>
                            </div>
                          ))}
                          {showSuffix && extraCount > 0 && (
                            <div className="pl-7 text-[11px] font-medium text-slate-400">
                              {t("compPost.andOthersCount", { count: extraCount })}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <div />
                )}

                {liveCommentCount > 0 && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {liveCommentCount} {t("general.comments", "bình luận")}
                  </span>
                )}
              </div>
            )}

            {/* Action Bar (Like / Comment buttons) */}
            <div className="flex items-center gap-2 pt-1 pb-2">
              {user?.id && postId > 0 ? (
                <LikeButton
                  postId={postId}
                  userId={user.id}
                  showLabel
                  externalLikeCount={likeCount}
                  onLikeChange={invalidateLivePost}
                />
              ) : (
                <span className="flex-1 text-center text-xs text-slate-500">
                  {t("compPost.prefer", "Đăng nhập để tương tác")}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-center gap-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => document.getElementById(`comment-input-${postId}`)?.focus()}>
                <MessageCircle className="h-4 w-4 text-slate-500" />
                <span>{t("common.comment1", "Bình luận")}</span>
              </Button>
            </div>

            {/* Comment Section */}
            {postId > 0 && (
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <CommentSection
                  key={postId}
                  postId={postId}
                  externalComments={postComments}
                  onExternalInvalidate={invalidateLivePost}
                  hideInput
                />
              </div>
            )}
          </div>

          {/* Sticky Bottom Comment Composer */}
          {postId > 0 && user?.id && (
            <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name ?? ""} />
                <AvatarFallback className="bg-indigo-600/10 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {(user.name ?? "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Textarea
                id={`comment-input-${postId}`}
                placeholder={t(
                  "compPost.writeACommentCtrlEnter",
                  "Viết bình luận... (Ctrl + Enter để gửi)"
                )}
                value={newComment}
                rows={1}
                className="max-h-24 flex-1 resize-none rounded-xl border-slate-200/80 bg-white px-3.5 py-2.5 text-xs text-slate-800 shadow-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleCommentSubmit();
                }}
              />
              <Button
                size="sm"
                className="h-9 w-9 shrink-0 rounded-xl bg-indigo-600 p-0 text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                onClick={handleCommentSubmit}
                disabled={!newComment.trim() || createComment.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {coverMediaItems.length > 0 && (
        <MediaLightboxDialog
          open={open && imageViewerOpen}
          onOpenChange={(nextOpen) => setImageViewerOpen(nextOpen)}
          items={coverMediaItems}
        />
      )}

      <LikeListModal likes={likers} open={likeModalOpen} onOpenChange={setLikeModalOpen} />
    </>
  );
}
