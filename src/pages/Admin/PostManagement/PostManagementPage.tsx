import { CommentSection, LikeButton, LikeListModal } from "@/components/post";
import { PaginationControl, ReloadButton, TruncatedScrollText } from "@/components/shared";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpinnerBlock } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import type { Post, PostCommentResponse, PostLikeResponse, PostStatus } from "@/interfaces";
import { formatDate, toTimestamp } from "@/lib/formatting";
import { queryClient } from "@/lib/queryClient";
import { getPostStatusBadge } from "@/lib/status-utils";
import { cn, extractDataArray } from "@/lib/utils";
import { postManager, usePostById } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Eye,
  MessageSquare,
  Plus,
  Search,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PostCreateForm } from "./components/PostCreateForm";
import { PostEditForm } from "./components/PostEditForm";
type StatusFilter = "all" | PostStatus;
type ViewState =
  | {
      mode: "list";
    }
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      postId: number;
    }
  | {
      mode: "detail";
      postId: number;
    };
type PostDetailPayload = {
  post?: Post;
  likeCount?: number;
  commentCount?: number;
  postLikes?: PostLikeResponse[];
  postComments?: PostCommentResponse[];
};
export function PostManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [view, setView] = useState<ViewState>({
    mode: "list",
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [likesOpen, setLikesOpen] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<number | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const detailPostId = view.mode === "detail" ? view.postId : 0;
  const { data: detailRaw, isLoading: detailLoading } = usePostById(
    detailPostId,
    view.mode === "detail" && detailPostId > 0
  );
  const detailData = detailRaw as unknown as PostDetailPayload | undefined;
  const loadPosts = useCallback(
    async (showReloading = false) => {
      if (showReloading) {
        setIsReloading(true);
      } else {
        setIsInitialLoading(true);
      }
      try {
        const response = await postManager.getAll();
        if (!response.success) {
          toast.error(response.error || t("common.unableToLoadArticleList"));
          return;
        }
        setPosts(extractDataArray<Post>(response));
      } catch {
        toast.error(t("common.unableToLoadArticleList"));
      } finally {
        if (showReloading) {
          setIsReloading(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    },
    [t]
  );
  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);
  const invalidatePostDetail = useCallback((postId: number) => {
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/api/posts/{postId}",
        {
          params: {
            path: {
              postId,
            },
          },
        },
      ],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/api/posts/feed"],
    });
  }, []);
  const allTags = useMemo(() => {
    return [...new Set(posts.flatMap((p) => p.tags ?? []))];
  }, [posts]);
  const filteredPosts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return posts
      .filter((post) => {
        if (statusFilter !== "all" && post.status !== statusFilter) {
          return false;
        }
        if (tagFilter !== "all" && !post.tags?.includes(tagFilter)) {
          return false;
        }
        if (!keyword) {
          return true;
        }
        const fields = [
          post.title,
          post.summary,
          post.content,
          post.author?.name,
          ...(post.tags ?? []),
        ];
        return fields.some((field) => field?.toLowerCase().includes(keyword));
      })
      .sort((a, b) => {
        const timeA = toTimestamp(a.creationDate) ?? 0;
        const timeB = toTimestamp(b.creationDate) ?? 0;
        return timeB - timeA;
      });
  }, [posts, searchQuery, statusFilter, tagFilter]);
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_postmanagement_postmanagementpage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({
    totalCount: filteredPosts.length,
    pageSize,
  });
  const pageItems = useMemo(
    () => filteredPosts.slice(pagination.startIndex, pagination.endIndex + 1),
    [filteredPosts, pagination.startIndex, pagination.endIndex]
  );

  // Stats calculation
  const stats = useMemo(() => {
    const total = posts.length;
    const draftCount = posts.filter((p) => p.status === "DRAFT").length;
    const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;
    const archivedCount = posts.filter((p) => p.status === "ARCHIVED").length;
    return { total, draftCount, publishedCount, archivedCount };
  }, [posts]);
  const detailPost = detailData?.post;
  const detailLikes = detailData?.postLikes ?? [];
  const detailComments = detailData?.postComments ?? [];
  const detailLikeCount = detailData?.likeCount ?? detailPost?.likeCount ?? 0;
  const detailCommentCount =
    detailData?.commentCount ?? detailData?.postComments?.length ?? detailPost?.commentCount ?? 0;
  const commentToDelete =
    commentToDeleteId != null
      ? detailComments.find((comment) => comment.id === commentToDeleteId)
      : undefined;
  const updateStatus = async (postId: number, status: PostStatus, successText: string) => {
    setStatusUpdatingId(postId);
    try {
      const response = await postManager.changeStatus(postId, status);
      if (response.success) {
        toast.success(successText);
        await loadPosts();
        invalidatePostDetail(postId);
      } else {
        toast.error(response.error || t("adminPostmanagement.unableToUpdatePostStatus"));
      }
    } finally {
      setStatusUpdatingId(null);
    }
  };
  const handleDeleteComment = async () => {
    if (!commentToDeleteId) {
      return;
    }
    setDeletingComment(true);
    try {
      const response = await postManager.deleteComment(commentToDeleteId);
      if (response.success) {
        toast.success(t("common.commentSuccessfullyDeleted"));
        setCommentToDeleteId(null);
        if (detailPostId > 0) {
          invalidatePostDetail(detailPostId);
        }
        await loadPosts();
      } else {
        toast.error(response.error || t("common.commentsCannotBeDeleted"));
      }
    } finally {
      setDeletingComment(false);
    }
  };
  const getPostKey = (post: Post, index: number) => {
    if (post.postId) {
      return `post-${post.postId}`;
    }
    return `post-${post.title ?? "untitled"}-${post.creationDate ?? "no-date"}-${index}`;
  };
  if (view.mode === "create") {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] flex-col overflow-hidden bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="flex flex-none items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setView({ mode: "list" })}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("common.createArticles")}
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <PostCreateForm
            onSuccess={() => {
              setView({ mode: "list" });
              void loadPosts();
            }}
            onCancel={() => setView({ mode: "list" })}
          />
        </div>
      </div>
    );
  }
  if (view.mode === "edit") {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] flex-col overflow-hidden bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="flex flex-none items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setView({ mode: "list" })}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("general.edit")}</h2>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <PostEditForm
            postId={view.postId}
            onSuccess={() => {
              setView({ mode: "list" });
              void loadPosts();
            }}
            onCancel={() => setView({ mode: "list" })}
          />
        </div>
      </div>
    );
  }
  if (view.mode === "detail") {
    return (
      <div className="-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="m-5 mb-6 flex flex-none flex-col gap-3 rounded-[20px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:m-6 sm:mb-6 sm:flex-row sm:items-center sm:justify-between md:mx-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              onClick={() => setView({ mode: "list" })}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" />
              {t("common.back", "Quay lại")}
            </button>
            <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("common.articlesCommunity")}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
              {t("adminPostmanagement.articleDetails")}
            </h2>
          </div>

          {detailPost?.postId && detailPost.status === "DRAFT" && (
            <div className="flex items-center gap-2">
              <Button
                className="h-8 bg-emerald-600 px-4 text-xs font-semibold hover:bg-emerald-700"
                onClick={() =>
                  void updateStatus(
                    detailPost.postId!,
                    "PUBLISHED",
                    t("adminPostmanagement.theArticleHasBeenApproved")
                  )
                }
                disabled={statusUpdatingId === detailPost.postId}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                {t("common.browse")}
              </Button>
              <Button
                variant="destructive"
                className="h-8 px-4 text-xs font-semibold"
                onClick={() =>
                  void updateStatus(detailPost.postId!, "ARCHIVED", t("common.postRejected"))
                }
                disabled={statusUpdatingId === detailPost.postId}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                {t("common.refuse")}
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto px-5 pb-6 sm:px-6 md:px-8">
          {detailLoading ? (
            <div className="flex h-64 items-center justify-center">
              <SpinnerBlock size="lg" />
            </div>
          ) : !detailPost ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">{t("common.noArticlesFound")}</p>
            </div>
          ) : (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {detailPost.coverImgUrl && (
                  <div className="aspect-[16/7] max-h-[420px] w-full overflow-hidden border-b border-slate-200 dark:border-slate-800">
                    <img
                      src={detailPost.coverImgUrl}
                      alt={detailPost.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="space-y-4 p-6 sm:p-8">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge {...getPostStatusBadge(detailPost.status)} />
                    {detailPost.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <CardTitle className="text-2xl leading-tight text-slate-900 dark:text-white">
                    {detailPost.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="text-foreground font-medium">
                      {detailPost.author?.name || t("common.anonymous")}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(detailPost.creationDate)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 px-6 pb-8 sm:px-8">
                  {detailPost.summary && (
                    <p className="border-l-2 border-indigo-500 pl-4 text-sm leading-6 font-medium text-slate-600 italic dark:text-slate-300">
                      {detailPost.summary}
                    </p>
                  )}
                  {detailPost.content && (
                    <p className="text-[15px] leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                      {detailPost.content}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 border-t pt-4">
                    <div className="text-muted-foreground flex items-center gap-1 text-sm">
                      <ThumbsUp className="h-4 w-4" />
                      {detailLikeCount} {t("general.likes")}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1 text-sm">
                      <MessageSquare className="h-4 w-4" />
                      {detailCommentCount} {t("general.comments")}
                    </div>
                    {user?.id && detailPost.postId && (
                      <LikeButton
                        postId={detailPost.postId}
                        userId={user.id}
                        externalLikeCount={detailLikeCount}
                        onLikeChange={() => invalidatePostDetail(detailPost.postId!)}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      disabled={detailLikes.length === 0}
                      onClick={() => setLikesOpen(true)}>
                      {t("adminPostmanagement.viewListOfLikes")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {detailPost.postId && (
                <Card className="rounded-2xl border-slate-200 shadow-sm xl:sticky xl:top-6 dark:border-slate-800 dark:bg-slate-900">
                  <CardHeader className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                    <CardTitle className="text-lg">
                      {t("adminPostmanagement.commentsFeedback")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CommentSection
                      postId={detailPost.postId}
                      externalComments={detailComments}
                      onExternalInvalidate={() => invalidatePostDetail(detailPost.postId!)}
                      allowDelete
                      onDeleteComment={setCommentToDeleteId}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <LikeListModal likes={detailLikes} open={likesOpen} onOpenChange={setLikesOpen} />

        <Dialog open={commentToDeleteId !== null} onOpenChange={() => setCommentToDeleteId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("common.confirmCommentDeletion")}</DialogTitle>
              <DialogDescription>
                {commentToDelete?.content
                  ? t("adminPostmanagement.areYouSureYouWant", {
                      var_0: commentToDelete.content,
                    })
                  : t("adminPostmanagement.areYouSureYouWant")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCommentToDeleteId(null)}>
                {t("general.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleDeleteComment()}
                disabled={deletingComment}>
                {deletingComment ? t("common.deleting") : t("adminPostmanagement.deleteComments")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-col bg-slate-50 dark:bg-slate-950",
        "-m-4 min-h-[calc(100%+32px)] md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)]"
      )}>
      <div className={cn("flex flex-col bg-slate-50 dark:bg-slate-950", "flex-1 overflow-hidden")}>
        {isInitialLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("adminPostmanagement.loadingArticleList")} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
            {/* Stat Summary & Control Card (matching User/Mentor pattern) */}
            <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("common.articlesCommunity")}
                  </h2>
                  <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                    {t("adminPostmanagement.manageContentModerationAndEngagement")}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-5 sm:gap-6">
                  {[
                    [stats.total, t("adminPostmanagement.totalArticles", "Tổng bài viết")],
                    [stats.draftCount, t("common.draft", "Bản nháp")],
                    [stats.publishedCount, t("common.published", "Đã xuất bản")],
                  ].map(([value, label], index) => (
                    <div key={String(label)} className="flex items-center gap-5 sm:gap-6">
                      {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                      <div className="flex min-w-[78px] flex-col items-center justify-center text-center">
                        <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-sky-400">
                          {value}
                        </span>
                        <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                          {label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search + Create row */}
              <form
                onSubmit={(event) => event.preventDefault()}
                className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="text"
                    placeholder={t("adminPostmanagement.searchByTitleContentAuthor")}
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      pagination.goToFirstPage();
                    }}
                    className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Search className="mr-2 h-[18px] w-[18px]" />
                  {t("common.search", "Tìm kiếm")}
                </Button>
                <ReloadButton
                  onReload={() => loadPosts(true)}
                  isLoading={isReloading}
                  tooltip={t("common.reloadArticleList")}
                  className="h-[46px] w-[46px] rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                />
                <Button
                  type="button"
                  onClick={() => setView({ mode: "create" })}
                  className="h-[46px] shrink-0 rounded-xl border border-indigo-600 bg-indigo-600 px-6 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                  <Plus className="mr-2 h-[18px] w-[18px]" />
                  {t("common.createArticles")}
                </Button>
              </form>

              {/* Status filter pills (matching User/Mentor pattern) */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  {t("common.status", "Trạng thái")}:
                </span>
                {[
                  ["all", t("common.allStatus", "Tất cả")],
                  ["DRAFT", t("common.draft", "Bản nháp")],
                  ["PUBLISHED", t("common.published", "Đã xuất bản")],
                  ["ARCHIVED", t("common.archived", "Đã lưu trữ")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(value as StatusFilter);
                      pagination.goToFirstPage();
                    }}
                    className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                      statusFilter === value
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90 dark:text-white dark:shadow-indigo-500/20"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    }`}>
                    {label}
                  </button>
                ))}

                {/* Tag select moved to right side */}
                <div className="ml-auto">
                  <Select
                    value={tagFilter}
                    onValueChange={(value) => {
                      setTagFilter(value);
                      pagination.goToFirstPage();
                    }}>
                    <SelectTrigger className="h-9 w-[160px] rounded-lg border-slate-200 text-xs dark:border-slate-700">
                      <SelectValue placeholder={t("adminPostmanagement.card")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("adminPostmanagement.allCards")}</SelectItem>
                      {allTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Table Card Container */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {pageItems.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <BookOpen className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    {t("adminPostmanagement.noArticlesFoundMatchingTheSelected")}
                  </p>
                  {(searchQuery || statusFilter !== "all" || tagFilter !== "all") && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setTagFilter("all");
                        pagination.goToFirstPage();
                      }}>
                      {t("common.clearFilter")}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {(searchQuery || statusFilter !== "all" || tagFilter !== "all") && (
                    <div className="flex flex-none items-center gap-2 px-6 pt-4">
                      <span className="text-sm text-slate-500">
                        {t("adminPostmanagement.showingResultsFor", { count: pageItems.length })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("all");
                          setTagFilter("all");
                          pagination.goToFirstPage();
                        }}
                        className="h-7 text-xs">
                        {t("common.clearFilter")}
                      </Button>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <Table className="min-w-[1120px] table-fixed">
                      <TableHeader>
                        <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
                          <TableHead className="w-[80px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
                            {t("common.id", "ID")}
                          </TableHead>
                          <TableHead className="w-[30%] min-w-[300px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                            {t("common.title")}
                          </TableHead>
                          <TableHead className="w-[190px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                            {t("adminPostmanagement.author")}
                          </TableHead>
                          <TableHead className="w-[135px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                            {t("common.status")}
                          </TableHead>
                          <TableHead className="w-[140px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                            {t("common.creationDate")}
                          </TableHead>
                          <TableHead className="w-[95px] px-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                            {t("adminPostmanagement.likes")}
                          </TableHead>
                          <TableHead className="w-[105px] px-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                            {t("common.comment1")}
                          </TableHead>
                          <TableHead className="w-[120px] pr-6 text-right font-semibold text-slate-700 dark:text-slate-200">
                            {t("common.operation")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageItems.map((post, index) => (
                          <TableRow
                            key={getPostKey(post, index)}
                            onClick={() =>
                              post.postId &&
                              setView({
                                mode: "detail",
                                postId: post.postId,
                              })
                            }
                            className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                            <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                              <div className="flex items-center gap-2">
                                <span>#{post.postId}</span>
                                {/* Dummy element to force row height alignment */}
                                <div
                                  className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                                  aria-hidden="true">
                                  <div className="h-3.5 w-3.5"></div>
                                  <div className="h-3.5 w-3.5"></div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[300px] px-4 py-4">
                              <TruncatedScrollText text={post.title || "—"} />
                              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                {post.summary || post.content || ""}
                              </p>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 shrink-0 border border-slate-200 dark:border-slate-700">
                                  <AvatarImage
                                    src={post.author?.avatarUrl || undefined}
                                    alt={post.author?.name || t("common.anonymous")}
                                  />
                                  <AvatarFallback className="bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                                    {(post.author?.name || "?").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {post.author?.name || "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <StatusBadge {...getPostStatusBadge(post.status)} />
                            </TableCell>
                            <TableCell className="px-4 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                              <span className="inline-flex items-center gap-2">
                                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                                {formatDate(post.creationDate)}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-4 text-center font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {post.likeCount ?? 0}
                            </TableCell>
                            <TableCell className="px-4 py-4 text-center font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {post.commentCount ?? 0}
                            </TableCell>
                            <TableCell
                              className="pr-6 text-right"
                              onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                {post.postId && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      setView({
                                        mode: "detail",
                                        postId: post.postId!,
                                      })
                                    }>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                {/* Edit functionality temporarily disabled on BE */}
                                {post.postId && post.status === "DRAFT" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                      onClick={() =>
                                        void updateStatus(
                                          post.postId!,
                                          "PUBLISHED",
                                          t("adminPostmanagement.theArticleHasBeenApproved")
                                        )
                                      }
                                      disabled={statusUpdatingId === post.postId}>
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      onClick={() =>
                                        void updateStatus(
                                          post.postId!,
                                          "ARCHIVED",
                                          t("common.postRejected")
                                        )
                                      }
                                      disabled={statusUpdatingId === post.postId}>
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredPosts.length > 0 && (
                    <div className="flex flex-none items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-t-slate-800 dark:bg-slate-900">
                      <PaginationControl
                        pagination={pagination}
                        showBoundaryButtons={false}
                        showPageJump={false}
                        pageSizeOptions={[6, 9, 10, 20]}
                        onPageSizeChange={(nextPageSize) => {
                          setPageSize(nextPageSize);
                          pagination.goToFirstPage();
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
