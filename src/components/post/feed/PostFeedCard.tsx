import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { saveFeedScrollPosition } from "@/lib/feedScrollMemory";
import { formatDateTime } from "@/lib/formatting";
import { useCheckLiked } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";
import { Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import type { components } from "../../../../schema-from-be";
import { LikeButton } from "../LikeButton";
import { LikeListModal } from "../LikeListModal";
import { PostFeedModal } from "./PostFeedModal";
type PostResponse = components["schemas"]["PostResponse"];
interface PostFeedCardProps {
  item: PostResponse;
}
export function PostFeedCard({ item }: PostFeedCardProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const post = item.post;
  const postId = post?.postId ?? 0;
  const commentCount = item.commentCount ?? 0;
  const { data: likedData } = useCheckLiked(postId, user?.id ?? 0, !!user?.id && postId > 0);
  const [localLikeAdjust, setLocalLikeAdjust] = useState(0);
  const rawLiked = Object.values(likedData ?? {})[0] as string | boolean | undefined;
  const isLiked = rawLiked === true || rawLiked === "true";
  const likeCount = (item.likeCount ?? 0) + localLikeAdjust;
  const [modalOpen, setModalOpen] = useState(false);
  const [likeModalOpen, setLikeModalOpen] = useState(false);

  // Navigate to the full-page detail view (User / Mentor / Staff).
  // Falls back to the legacy Modal when the route segment can't be inferred.
  const openDetailPage = () => {
    if (!postId) return;
    const roleSegment = location.pathname.match(/^\/(user|mentor|staff)(?:\/|$)/)?.[1];
    if (roleSegment) {
      // Persist the feed's current scroll position into sessionStorage
      // synchronously, *before* navigation. CommunityFeedPage reads this
      // when it mounts again after the user comes back from the detail
      // page and restores the scroll. We capture the value at the click
      // because the dashboard's overflow handling can reset scrollTop
      // during the route change, and the React effect lifecycle isn't
      // guaranteed to run before the DOM swap.
      const scrollContainer = document.querySelector(
        '[data-dashboard-content-scroll="true"]'
      ) as HTMLElement | null;
      if (scrollContainer) {
        saveFeedScrollPosition({
          scrollTop: Math.max(0, scrollContainer.scrollTop),
          postId,
        });
      }
      navigate(`/${roleSegment}/home-feed/${postId}`);
      return;
    }
    setModalOpen(true);
  };

  // Synchronized list of users who liked the post (excluding empty/null userNames)
  const rawLikers = (item.postLikes ?? []).filter(
    (l): l is components["schemas"]["PostLikeResponse"] & { userName: string } => !!l.userName
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
  const [localCommentCount, setLocalCommentCount] = useState(commentCount);
  const authorName = post?.author?.name ?? t("common.anonymous");
  const authorInitials = authorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const likeLabel = (() => {
    if (likeCount === 0) return null;
    if (isLiked && likeCount === 1) return t("common.friend");
    if (isLiked)
      return t("general.youAndOthers", {
        var_0: likeCount - 1,
      });
    return `${likeCount}`;
  })();
  return (
    <>
      <Card
        className="cursor-pointer overflow-hidden rounded-2xl border-slate-200/80 bg-white py-0 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
        onClick={openDetailPage}>
        <CardHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-indigo-50 dark:ring-indigo-500/15">
              <AvatarImage src={post?.author?.avatar} alt={authorName} />
              <AvatarFallback className="bg-indigo-500/10 text-sm font-bold text-indigo-600 dark:text-indigo-300">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{authorName}</span>
              </div>
              <p className="text-muted-foreground text-xs">{formatDateTime(post?.creationDate)}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-5 pb-4">
          <h3 className="line-clamp-2 text-lg leading-snug font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
            {post?.title}
          </h3>

          {post?.summary && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-500/15 dark:bg-indigo-500/[0.08]">
              <p className="line-clamp-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {post.summary}
              </p>
            </div>
          )}

          {post?.content && post.content !== post?.summary && (
            <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
              {post.content}
            </p>
          )}

          {(post?.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {post!.tags!.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs text-slate-500 dark:text-slate-400">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        {post?.coverImgUrl && (
          <div className="flex max-h-[720px] w-full items-center justify-center overflow-hidden bg-slate-950/[0.04] dark:bg-black/20">
            <img
              src={post.coverImgUrl}
              alt={post.title ?? ""}
              className="max-h-[720px] w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />
          </div>
        )}

        {(likeLabel || localCommentCount > 0) && (
          <div className="flex items-center gap-1 px-5 py-1">
            {likeLabel && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      // Stop propagation: clicking the like tooltip trigger
                      // should not also navigate to the post detail.
                      onClick={(event) => {
                        event.stopPropagation();
                        setLikeModalOpen(true);
                      }}
                      className="flex cursor-pointer items-center gap-1 text-left hover:underline">
                      <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                      <span className="text-muted-foreground text-xs">{likeLabel}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="z-50 max-w-xs rounded-lg border-slate-800 bg-slate-900 p-2 text-slate-50 shadow-xl">
                    <div className="space-y-1.5">
                      {displayLikers.map((liker) => (
                        <div key={liker.userName} className="flex items-center gap-2">
                          <Avatar className="h-5 w-5 ring-1 ring-slate-700/50">
                            <AvatarImage src={liker.userAvatar} alt={liker.userName} />
                            <AvatarFallback className="bg-[#0047AB]/20 text-[10px] font-bold text-[#66B2FF]">
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
            )}
            {localCommentCount > 0 && (
              <button
                type="button"
                // Same here — comment-count chip navigates on its own
                // (stopPropagation keeps the parent Card from also firing).
                onClick={(event) => {
                  event.stopPropagation();
                  openDetailPage();
                }}
                className="text-muted-foreground ml-auto text-xs hover:underline">
                {localCommentCount} {t("general.comments")}
              </button>
            )}
          </div>
        )}

        <Separator className="mx-5" />

        <CardFooter className="grid grid-cols-2 gap-2 px-5 py-2.5">
          {/* Wrap the LikeButton in a div that stops propagation so a like
              tap does not also navigate to the detail page. */}
          {user?.id && postId > 0 ? (
            <div onClick={(event) => event.stopPropagation()} className="contents">
              <LikeButton
                postId={postId}
                userId={user.id}
                showLabel
                externalLikeCount={likeCount}
                onLikeChange={(liked) => setLocalLikeAdjust(liked ? 1 : -1)}
              />
            </div>
          ) : (
            <span className="text-muted-foreground flex-1 text-center text-sm">
              {t("compPost.prefer")}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            // Same here — explicit comment button is the most prominent
            // CTA but tapping it shouldn't fire twice if the user hits
            // the centre of the card by accident.
            onClick={(event) => {
              event.stopPropagation();
              openDetailPage();
            }}
            className="flex-1 justify-center gap-1.5 rounded-xl text-sm font-semibold hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300">
            <MessageCircle className="h-4 w-4" />
            <span>{t("common.comment1")}</span>
          </Button>
        </CardFooter>
      </Card>

      <PostFeedModal
        item={item}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCommentCountChange={setLocalCommentCount}
      />

      <LikeListModal likes={likers} open={likeModalOpen} onOpenChange={setLikeModalOpen} />
    </>
  );
}
