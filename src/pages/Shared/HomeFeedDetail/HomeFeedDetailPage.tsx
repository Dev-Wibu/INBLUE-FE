/**
 * HomeFeedDetailPage — full-page post detail view (User / Mentor / Staff).
 *
 * Layout (Facebook-style 2-column post detail):
 *   ┌──────────────────────────────────────────────────────┐
 *   │ [X]                                                  │
 *   │                                                      │
 *   │  ┌────────────────────────┐  ┌─────────────────────┐ │
 *   │  │                        │  │ Author              │ │
 *   │  │       MEDIA (~58%)     │  │ Title               │ │
 *   │  │       h-screen         │  │ Summary / Body      │ │
 *   │  │       object-contain   │  │ Tags                │ │
 *   │  │       dark bg          │  │ Reactions bar       │ │
 *   │  │                        │  │ Comment list        │ │
 *   │  │                        │  │ Comment composer    │ │
 *   │  └────────────────────────┘  └─────────────────────┘ │
 *   └──────────────────────────────────────────────────────┘
 *
 * The X button is floating (top-left, outside the grid) so it is always
 * reachable regardless of which column the user is interacting with.
 * The right column scrolls internally so the comment composer can stay
 * pinned at the bottom of the column (Facebook style).
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
import { cn } from "@/lib/utils";
import { useCheckLiked, useCreateComment, usePostById } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";
import { Heart, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const BODY_COLLAPSE_LINE_CLAMP = 5;

export function HomeFeedDetailPage({ backTo }: HomeFeedDetailPageProps) {
  const { t } = useTranslation();
  const { postId: rawPostId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const postId = Number(rawPostId ?? 0);

  const [newComment, setNewComment] = useState("");
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [likeModalOpen, setLikeModalOpen] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [bodyIsLong, setBodyIsLong] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement | null>(null);

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

  // Detect whether the body is long enough to warrant the See-more toggle.
  // We measure after render (clientHeight vs lineHeight * threshold).
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const threshold = BODY_COLLAPSE_LINE_CLAMP + 0.5;
    setBodyIsLong(el.scrollHeight > lineHeight * threshold);
  }, [post?.content]);

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
      <EmptyState
        onClose={handleClose}
        title={t("compPost.feedDetail.invalidPostId", "Invalid post id.")}
      />
    );
  }

  if (isLoading) {
    return (
      <DetailShellSkeleton
        backToFeedLabel={t("compPost.feedDetail.backToFeed", "Back to feed")}
        onClose={handleClose}
      />
    );
  }

  if (!post) {
    return (
      <EmptyState
        onClose={handleClose}
        title={t("compPost.feedDetail.postNotFound", "This post could not be found.")}
        description={t(
          "compPost.feedDetail.postNotFoundHint",
          "It may have been removed or you may not have permission to view it."
        )}
      />
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
      {/* Full-viewport 2-column layout. h-screen keeps both columns anchored
          to the visible viewport on desktop so the user never needs to scroll
          the page itself to find the composer / comments. */}
      <div className="grid h-screen w-full bg-slate-50 lg:grid-cols-[minmax(0,1.4fr)_minmax(420px,1fr)] dark:bg-slate-950">
        {/* LEFT — media canvas (fills viewport height) */}
        <section
          aria-label={t("compPost.feedDetail.media", "Post media")}
          className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-950">
          {post.coverImgUrl ? (
            <button
              type="button"
              aria-label={t("common.clickToEnlarge", "Click to enlarge")}
              onClick={() => setImageViewerOpen(true)}
              className="group flex h-full w-full items-center justify-center">
              <img
                src={post.coverImgUrl}
                alt={post.title ?? ""}
                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.005]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/50 via-transparent to-transparent p-5 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                  {t("common.clickToEnlarge", "Click to enlarge")}
                </span>
              </div>
            </button>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-10 text-center">
              <MessageCircle className="h-12 w-12 text-slate-500" aria-hidden />
              <p className="text-sm font-medium text-slate-400">
                {t("compPost.feedDetail.noMediaAttached", "This post has no media attached.")}
              </p>
            </div>
          )}

          {/* Floating X close — top-left of the media column. Always visible
              and unmistakable so the user can return to the feed at any time. */}
          <button
            type="button"
            aria-label={t("compPost.feedDetail.backToFeed", "Back to feed")}
            onClick={handleClose}
            className="absolute top-4 left-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-lg ring-1 ring-white/10 backdrop-blur-md transition-all hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </section>

        {/* RIGHT — content / comments (scrolls internally) */}
        <section className="flex h-full min-w-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {/* Author header */}
          <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-slate-800">
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
                {formatDateTime(post.creationDate)} · #{postId}
              </p>
            </div>
          </header>

          {/* Scrollable body — header + composer remain pinned. */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <article className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
              {post.title && (
                <h1 className="text-2xl leading-snug font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  {post.title}
                </h1>
              )}

              {post.summary && (
                <div className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50/50 px-4 py-3 dark:border-indigo-500 dark:bg-indigo-950/30">
                  <p className="text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                    {post.summary}
                  </p>
                </div>
              )}

              {post.content && (
                <div>
                  <p
                    ref={bodyRef}
                    className={cn(
                      "text-[15px] leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200",
                      !bodyExpanded && bodyIsLong && "line-clamp-5"
                    )}>
                    {post.content}
                  </p>
                  {bodyIsLong && (
                    <button
                      type="button"
                      onClick={() => setBodyExpanded((v) => !v)}
                      className="mt-1 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300">
                      {bodyExpanded
                        ? t("compPost.feedDetail.showLess", "Show less")
                        : t("compPost.feedDetail.seeMore", "See more")}
                    </button>
                  )}
                </div>
              )}

              {(post.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
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

              {/* Reactions summary */}
              {(likeLabel || liveCommentCount > 0) && (
                <div className="flex items-center justify-between border-t border-b border-slate-100 py-2.5 text-xs dark:border-slate-800">
                  {likeLabel ? (
                    <button
                      type="button"
                      onClick={() => setLikeModalOpen(true)}
                      className="flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
                      <Heart className="h-4 w-4 fill-rose-500 text-rose-500" aria-hidden />
                      <span>{likeLabel}</span>
                    </button>
                  ) : (
                    <span />
                  )}
                  {liveCommentCount > 0 && (
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {liveCommentCount} {t("general.comments", "comments")}
                    </span>
                  )}
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center gap-2">
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

              {/* Comments */}
              {postId > 0 && (
                <div className="pt-2">
                  <CommentSection
                    key={postId}
                    postId={postId}
                    externalComments={postComments}
                    onExternalInvalidate={invalidate}
                    hideInput
                  />
                </div>
              )}
            </article>
          </div>

          {/* Sticky bottom composer */}
          {postId > 0 && user?.id && (
            <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:px-6 dark:border-slate-800 dark:bg-slate-900/80">
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
                className="max-h-24 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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

/* -------------------------------------------------------------------------- */
/* Loading / empty / error shells                                             */
/* -------------------------------------------------------------------------- */

function EmptyState({
  onClose,
  title,
  description,
}: {
  onClose: () => void;
  title: string;
  description?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid h-screen w-full place-items-center bg-slate-50 px-6 dark:bg-slate-950">
      <div className="relative flex max-w-md flex-col items-center gap-3 text-center">
        <button
          type="button"
          aria-label={t("compPost.feedDetail.backToFeed", "Back to feed")}
          onClick={onClose}
          className="absolute -top-12 -left-12 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg ring-1 ring-white/10 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none dark:bg-slate-800 dark:hover:bg-slate-700">
          <X className="h-5 w-5" aria-hidden />
        </button>
        <MessageCircle className="h-10 w-10 text-slate-400" aria-hidden />
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
    </div>
  );
}

function DetailShellSkeleton({
  onClose,
  backToFeedLabel,
}: {
  onClose: () => void;
  backToFeedLabel: string;
}) {
  return (
    <div className="grid h-screen w-full bg-slate-50 lg:grid-cols-[minmax(0,1.4fr)_minmax(420px,1fr)] dark:bg-slate-950">
      <section className="relative flex h-full items-center justify-center bg-slate-950">
        <Skeleton className="h-3/4 w-3/4 rounded-xl bg-slate-800/60" />
        <button
          type="button"
          aria-label={backToFeedLabel}
          onClick={onClose}
          className="absolute top-4 left-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-lg ring-1 ring-white/10 hover:bg-slate-900">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </section>
      <section className="flex h-full flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-3 border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
        <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </section>
    </div>
  );
}
