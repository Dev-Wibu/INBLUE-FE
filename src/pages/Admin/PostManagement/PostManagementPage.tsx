import { CommentSection, LikeButton, LikeListModal } from "@/components/post";
import { PaginationControl, ReloadButton } from "@/components/shared";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import { extractDataArray } from "@/lib/utils";
import { postManager, usePostById } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  MessageSquare,
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
  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== "all" || tagFilter !== "all";
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
      <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="flex flex-none items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView({ mode: "list" })}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
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

        <div className="flex-1 overflow-auto">
          {detailLoading ? (
            <div className="flex h-64 items-center justify-center">
              <SpinnerBlock size="lg" />
            </div>
          ) : !detailPost ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">{t("common.noArticlesFound")}</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 p-6">
              <Card>
                {detailPost.coverImgUrl && (
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                    <img
                      src={detailPost.coverImgUrl}
                      alt={detailPost.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge {...getPostStatusBadge(detailPost.status)} />
                    {detailPost.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <CardTitle className="text-2xl">{detailPost.title}</CardTitle>
                  <div className="text-muted-foreground text-sm">
                    <span className="text-foreground font-medium">
                      {detailPost.author?.name || t("common.anonymous")}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{formatDate(detailPost.creationDate)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detailPost.summary && (
                    <p className="text-muted-foreground italic">{detailPost.summary}</p>
                  )}
                  {detailPost.content && (
                    <p className="whitespace-pre-wrap">{detailPost.content}</p>
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
                <Card>
                  <CardHeader>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("common.confirmCommentDeletion")}</DialogTitle>
              <DialogDescription>
                {commentToDelete?.content
                  ? t("general.areYouSureYouWant", {
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
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* ── TOOLBAR ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("common.articlesCommunity")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("adminPostmanagement.manageContentModerationAndEngagement")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={t("adminPostmanagement.searchByTitleContentAuthor")}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                pagination.goToFirstPage();
              }}
              className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-[140px] border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allStatus")}</SelectItem>
              <SelectItem value="DRAFT">{t("common.draft")}</SelectItem>
              <SelectItem value="PUBLISHED">{t("common.published")}</SelectItem>
              <SelectItem value="ARCHIVED">{t("common.archived")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={tagFilter}
            onValueChange={(value) => {
              setTagFilter(value);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-[140px] border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
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

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setTagFilter("all");
                pagination.goToFirstPage();
              }}
              className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
              {t("common.clearFilter")}
            </Button>
          )}

          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />

          <ReloadButton
            onReload={() => loadPosts(true)}
            isLoading={isReloading}
            tooltip={t("common.reloadArticleList")}
            className="h-8 w-8"
          />
          <Button
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() =>
              setView({
                mode: "create",
              })
            }>
            {t("common.createArticles")}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {isInitialLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("adminPostmanagement.loadingArticleList")} />
          </div>
        ) : pageItems.length === 0 ? (
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
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-hidden duration-300">
            {(searchQuery || statusFilter !== "all" || tagFilter !== "all") && (
              <div className="mb-3 flex flex-none items-center gap-2 px-6 pt-4">
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
            <div className="flex-1 overflow-auto border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t("common.id", "ID")}</TableHead>
                    <TableHead>{t("common.title")}</TableHead>
                    <TableHead>{t("adminPostmanagement.author")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("common.creationDate")}</TableHead>
                    <TableHead>{t("adminPostmanagement.likes")}</TableHead>
                    <TableHead>{t("common.comment1")}</TableHead>
                    <TableHead className="text-right">{t("common.operation")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((post, index) => (
                    <TableRow key={getPostKey(post, index)}>
                      <TableCell className="font-medium">#{post.postId}</TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="truncate font-medium">{post.title || "—"}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {post.summary || post.content || ""}
                        </p>
                      </TableCell>
                      <TableCell>{post.author?.name || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge {...getPostStatusBadge(post.status)} />
                      </TableCell>
                      <TableCell>{formatDate(post.creationDate)}</TableCell>
                      <TableCell>{post.likeCount ?? 0}</TableCell>
                      <TableCell>{post.commentCount ?? 0}</TableCell>
                      <TableCell className="text-right">
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

            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="mt-4 flex items-center justify-end rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <PaginationControl
                  pagination={pagination}
                  onPageSizeChange={(nextPageSize) => {
                    setPageSize(nextPageSize);
                    pagination.goToFirstPage();
                  }}
                  pageSizeOptions={[6, 9, 10, 20]}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
