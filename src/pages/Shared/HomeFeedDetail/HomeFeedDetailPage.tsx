/**
 * HomeFeedDetailPage — full-page post detail view (User / Mentor / Staff).
 *
 * Mirrors the existing PostFeedModal but as a standalone route so that:
 *   - The URL is shareable (e.g. /user/home-feed/123).
 *   - Browser back / X button returns the user to the Home Feed with
 *     their previous scroll position intact (handled by ScrollRestoration).
 *   - There is no longer a Dialog wrapper — the page itself is the detail.
 *
 * No business logic / API changes were introduced. The page reuses
 * LikeButton, CommentSection, MediaLightboxDialog, LikeListModal, and the
 * existing usePostById / useCheckLiked / useCreateComment hooks.
 */

import { CommentSection } from "@/components/post/CommentSection";
import { LikeButton } from "@/components/post/LikeButton";
import { LikeListModal } from "@/components/post/LikeListModal";
import { MediaLightboxDialog } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/formatting";
import { invalidatePostFeedQueries } from "@/lib/post-feed";
import { useCheckLiked, useCreateComment, usePostById } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";
import { Heart, MessageCircle, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { components } from "../../../../schema-from-be";

type PostResponse = components["schemas"]["PostResponse"];
type PostLikeResponse = components["schemas"]["PostLikeResponse"];
type PostCommentResponse = components["schemas"]["PostCommentResponse"];

interface HomeFeedDetailPageProps {
  /**
   * Where the X button (and the browser back) should land. Defaults to the
   * role-aware home feed path. Passing it explicitly avoids having to read
   * auth state from inside the page just to build the URL.
   */
  backTo?: string;
}

export function HomeFeedDetailPage({ backTo }: HomeFeedDetailPageProps) {
  const { t } = useTranslation();
  const { postId: rawPostId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const postId = Number(rawPostId ?? 0);

  const [newComment, setNewComment] = useState("");
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [likeModalOpen, setLikeModalOpen] = useState(false);

  const shouldFetchLive = !!user?.id && postId > 0;
  const { data: liveRaw, isLoading } = usePostById(postId, shouldFetchLive);
  const live = liveRaw as unknown as PostResponse | undefined;
  const { data: likedData } = useCheckLiked(postId, user?.id ?? 0, shouldFetchLive);
  const createComment = useCreateComment();

  const post = live?.post;
  const authorName = post?.author?.name ?? t("common.anonymous", "Anonymous");
  const authorInitials = useMemo(
    () =>
      authorName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [authorName]
  );

  const rawLiked = Object.values(likedData ?? {})[0] as string | boolean | undefined;
  const isLiked = rawLiked === true || rawLiked === "true";
  const likeCount = live?.likeCount ?? 0;
  const liveCommentCount = live?.commentCount ?? 0;
  const postComments = (live?.postComments ?? []) as PostCommentResponse[];

  const likers = useMemo(() => {
    const raw = ((live?.postLikes ?? []) as PostLikeResponse[]).filter(
      (l): l is PostLikeResponse & { userName: string } => !!l.userName
    );
    const list = [...raw];
    if (isLiked && user?.name) {
      if (!list.some((l) => l.userName === user.name)) {
        list.unshift({ userName: user.name, userAvatar: user.avatarUrl ?? "" });
      }
    } else if (!isLiked && user?.name) {
      const idx = list.findIndex((l) => l.userName === user.name);
      if (idx !== -1) list.splice(idx, 1);
    }
    return list;
  }, [live?.postLikes, isLiked, user]);

  const likeLabel = (() => {
    if (likeCount === 0) return null;
    if (isLiked && likeCount === 1) return t("common.friend", "You");
    if (isLiked)
      return t("general.youAndOthers", {
        var_0: likeCount - 1,
      });
    return `${likeCount}`;
  })();

  const invalidate = () => invalidatePostFeedQueries(postId);

  const handleCommentSubmit = () => {
    const content = newComment.trim();
    const numericUserId = typeof user?.id === "string" ? parseInt(user.id, 10) : user?.id;
    if (!content || !numericUserId) return;

    createComment.mutate(
      {
        body: {
          postId,
          userId: numericUserId,
          content,
        },
      } as never,
      {
        onSuccess: () => {
          setNewComment("");
          invalidate();
        },
        onError: () => toast.error(t("compPost.cannotPostComments", "Cannot post comments")),
      }
    );
  };

  const handleClose = () => {
    if (imageViewerOpen) return;
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigate(-1);
  };

  if (!postId) {
    return (
      <DetailShell>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="gap-1.5 self-start text-slate-600 dark:text-slate-300">
          <X className="h-4 w-4" aria-hidden />
          {t("compPost.feedDetail.backToFeed", "Back to feed")}
        </Button>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("compPost.feedDetail.invalidPostId", "Invalid post id.")}
          </p>
        </div>
      </DetailShell>
    );
  }

  if (isLoading) {
    return (
      <DetailShell>
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Skeleton className="h-[420px] w-full rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        </div>
      </DetailShell>
    );
  }

  if (!post) {
    return (
      <DetailShell>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="gap-1.5 self-start text-slate-600 dark:text-slate-300">
          <X className="h-4 w-4" aria-hidden />
          {t("compPost.feedDetail.backToFeed", "Back to feed")}
        </Button>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <MessageCircle className="h-12 w-12 text-slate-400" aria-hidden />
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("compPost.feedDetail.postNotFound", "This post could not be found.")}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t(
              "compPost.feedDetail.postNotFoundHint",
              "It may have been removed or you may not have permission to view it."
            )}
          </p>
        </div>
      </DetailShell>
    );
  }

  const coverMediaItems = post.coverImgUrl
    ? [
        {
          id: `post-cover-${postId}`,
          name: post.title ?? t("compPost.articlePhoto", "Article photo"),
          src: post.coverImgUrl,
          alt: post.title ?? t("compPost.articlePhoto", "Article photo"),
          kind: "image" as const,
          requireAuth: false,
        },
      ]
    : [];

  return (
    <>
      <DetailShell>
        {/* Top action bar — X back button + breadcrumbs */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            aria-label={t("compPost.feedDetail.backToFeed", "Back to feed")}
            className="gap-1.5 text-slate-600 dark:text-slate-300">
            <X className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">
              {t("compPost.feedDetail.backToFeed", "Back to feed")}
            </span>
          </Button>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">#{postId}</span>
        </div>

        {/* 2-column body (Facebook-style) */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* LEFT — media canvas */}
          <section
            aria-label={t("compPost.feedDetail.media", "Post media")}
            className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start dark:border-slate-800 dark:bg-slate-950/60">
            {post.coverImgUrl ? (
              <button
                type="button"
                aria-label={t("common.clickToEnlarge", "Click to enlarge")}
                onClick={() => setImageViewerOpen(true)}
                className="group relative flex h-full w-full items-center justify-center">
                <img
                  src={post.coverImgUrl}
                  alt={post.title ?? ""}
                  className="max-h-[calc(100vh-3rem)] w-full object-contain transition-transform duration-300 group-hover:scale-[1.005]"
                />
                <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/30 via-transparent to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                    {t("common.clickToEnlarge", "Click to enlarge")}
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 p-10 text-center dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
                <MessageCircle
                  className="h-10 w-10 text-slate-400 dark:text-slate-600"
                  aria-hidden
                />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t("compPost.feedDetail.noMediaAttached", "This post has no media attached.")}
                </p>
              </div>
            )}
          </section>

          {/* RIGHT — author / title / body / comments */}
          <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {/* Author header */}
            <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <Avatar className="h-11 w-11 shrink-0 ring-2 ring-slate-100 dark:ring-slate-800">
                <AvatarImage src={post.author?.avatar} alt={authorName} />
                <AvatarFallback className="bg-indigo-500/10 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                    {authorName}
                  </h2>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(post as any)?.majorName && (
                    <Badge
                      variant="secondary"
                      className="border-0 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-300">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(post as any).majorName}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {formatDateTime(post.creationDate)}
                </p>
              </div>
            </header>

            {/* Article body — scrolls independently on long content */}
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <h1 className="text-2xl leading-snug font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {post.title}
              </h1>

              {post.summary && (
                <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50/50 px-4 py-3 dark:border-indigo-500 dark:bg-indigo-950/30">
                  <p className="text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                    {post.summary}
                  </p>
                </div>
              )}

              {post.content && (
                <p className="text-base leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                  {post.content}
                </p>
              )}

              {(post.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {post.tags!.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="rounded-md border-0 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Like / comment counts */}
              {(likeLabel || liveCommentCount > 0) && (
                <div className="flex items-center justify-between border-t border-b border-slate-100 py-2.5 dark:border-slate-800">
                  {likeLabel ? (
                    <button
                      type="button"
                      onClick={() => setLikeModalOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
                      <Heart className="h-4 w-4 fill-rose-500 text-rose-500" aria-hidden />
                      <span>{likeLabel}</span>
                    </button>
                  ) : (
                    <div />
                  )}
                  {liveCommentCount > 0 && (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {liveCommentCount} {t("general.comments", "comments")}
                    </span>
                  )}
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center gap-2 pt-1">
                {user?.id && postId > 0 ? (
                  <LikeButton
                    postId={postId}
                    userId={user.id}
                    showLabel
                    externalLikeCount={likeCount}
                    onLikeChange={invalidate}
                  />
                ) : (
                  <span className="flex-1 text-center text-xs text-slate-500">
                    {t("compPost.prefer", "Log in to interact")}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-center gap-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => {
                    document.getElementById(`home-feed-detail-comment-input-${postId}`)?.focus();
                  }}>
                  <MessageCircle className="h-4 w-4 text-slate-500" aria-hidden />
                  <span>{t("common.comment1", "Comment")}</span>
                </Button>
              </div>

              {/* Comment list */}
              {postId > 0 && (
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <CommentSection
                    key={postId}
                    postId={postId}
                    externalComments={postComments}
                    onExternalInvalidate={invalidate}
                    hideInput
                  />
                </div>
              )}
            </div>

            {/* Sticky bottom composer */}
            {postId > 0 && user?.id && (
              <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name ?? ""} />
                  <AvatarFallback className="bg-indigo-500/10 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                    {(user.name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <textarea
                  id={`home-feed-detail-comment-input-${postId}`}
                  rows={1}
                  placeholder={t(
                    "compPost.writeACommentCtrlEnter",
                    "Write a comment... (Ctrl+Enter to post)"
                  )}
                  value={newComment}
                  className="max-h-24 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) handleCommentSubmit();
                  }}
                />
                <Button
                  size="sm"
                  className="h-9 w-9 shrink-0 rounded-xl bg-indigo-600 p-0 text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim() || createComment.isPending}
                  aria-label={t("compPost.send", "Send")}>
                  <Send className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            )}
          </section>
        </div>
      </DetailShell>

      {coverMediaItems.length > 0 && (
        <MediaLightboxDialog
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          items={coverMediaItems}
        />
      )}

      <LikeListModal likes={likers} open={likeModalOpen} onOpenChange={setLikeModalOpen} />
    </>
  );
}

/**
 * Consistent outer shell so every state (loading, empty, content) shares the
 * same width, gutter, and background treatment — which keeps the dark theme
 * aligned with the rest of the app's home feed surface.
 */
function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-4 min-h-full bg-slate-50/70 px-4 py-5 sm:-m-6 sm:px-6 lg:-m-8 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-[1140px] flex-col gap-4">{children}</div>
    </div>
  );
}
