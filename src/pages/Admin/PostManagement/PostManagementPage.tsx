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
  CheckCircle2,
  Columns2,
  Eye,
  LayoutGrid,
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
type ListLayout = "table" | "grid";
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
  const [layout, setLayout] = useState<ListLayout>("table");
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
  const statusCounts = useMemo(() => {
    return {
      total: posts.length,
      draft: posts.filter((post) => post.status === "DRAFT").length,
      published: posts.filter((post) => post.status === "PUBLISHED").length,
      archived: posts.filter((post) => post.status === "ARCHIVED").length,
    };
  }, [posts]);
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
      <div className="space-y-4 p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setView({
              mode: "list",
            })
          }>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
        <PostCreateForm
          onSuccess={() => {
            setView({
              mode: "list",
            });
            void loadPosts();
          }}
          onCancel={() =>
            setView({
              mode: "list",
            })
          }
        />
      </div>
    );
  }
  if (view.mode === "edit") {
    return (
      <div className="space-y-4 p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setView({
              mode: "list",
            })
          }>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
        <PostEditForm
          postId={view.postId}
          onSuccess={() => {
            setView({
              mode: "list",
            });
            void loadPosts();
          }}
          onCancel={() =>
            setView({
              mode: "list",
            })
          }
        />
      </div>
    );
  }
  if (view.mode === "detail") {
    return (
      <div className="space-y-4 p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setView({
              mode: "list",
            })
          }>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>

        {detailLoading ? (
          <SpinnerBlock size="lg" />
        ) : !detailPost ? (
          <p className="text-muted-foreground">{t("common.noArticlesFound")}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{t("adminPostmanagement.articleDetails")}</h2>
                <p className="text-muted-foreground text-sm">
                  {t("adminPostmanagement.trackEngagementAndModerateComments")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Edit functionality temporarily disabled on BE
                {detailPost.postId && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setView({
                        mode: "edit",
                        postId: detailPost.postId!,
                      })
                    }>
                    <PenSquare className="mr-1 h-4 w-4" />
                    {t("general.edit")}
                  </Button>
                )} */}
                {detailPost.postId && detailPost.status === "DRAFT" && (
                  <>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() =>
                        void updateStatus(
                          detailPost.postId!,
                          "PUBLISHED",
                          t("adminPostmanagement.theArticleHasBeenApproved")
                        )
                      }
                      disabled={statusUpdatingId === detailPost.postId}>
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      {t("common.browse")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        void updateStatus(detailPost.postId!, "ARCHIVED", t("common.postRejected"))
                      }
                      disabled={statusUpdatingId === detailPost.postId}>
                      <XCircle className="mr-1 h-4 w-4" />
                      {t("common.refuse")}
                    </Button>
                  </>
                )}
              </div>
            </div>

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
                {detailPost.content && <p className="whitespace-pre-wrap">{detailPost.content}</p>}

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
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("common.articlesCommunity")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("adminPostmanagement.manageContentModerationAndEngagement")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReloadButton
            onReload={() => loadPosts(true)}
            isLoading={isReloading}
            tooltip={t("common.reloadArticleList")}
            showLabel
            hideTooltip
          />
          <Button
            onClick={() =>
              setView({
                mode: "create",
              })
            }>
            {t("common.createArticles")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {t("adminPostmanagement.totalArticle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{statusCounts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {t("common.draft")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{statusCounts.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {t("common.published")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{statusCounts.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {t("common.archived")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-600">{statusCounts.archived}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder={t("adminPostmanagement.searchByTitleContentAuthor")}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  pagination.goToFirstPage();
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter);
                pagination.goToFirstPage();
              }}>
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
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

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                variant={layout === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setLayout("table")}>
                <Columns2 className="mr-1 h-4 w-4" />
                {t("adminPostmanagement.board")}
              </Button>
              <Button
                variant={layout === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setLayout("grid")}>
                <LayoutGrid className="mr-1 h-4 w-4" />
                {t("adminPostmanagement.net")}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
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
          </div>

          {isInitialLoading ? (
            <SpinnerBlock size="lg" />
          ) : pageItems.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              {t("adminPostmanagement.thereAreNoMatchingArticles")}
            </p>
          ) : layout === "table" ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
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
                              onClick={() =>
                                setView({
                                  mode: "detail",
                                  postId: post.postId!,
                                })
                              }>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Edit functionality temporarily disabled on BE
                          {post.postId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setView({
                                  mode: "edit",
                                  postId: post.postId!,
                                })
                              }>
                              <PenSquare className="h-4 w-4" />
                            </Button>
                          )} */}
                          {post.postId && post.status === "DRAFT" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
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
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((post, index) => (
                <Card key={getPostKey(post, index)} className="flex flex-col">
                  {post.coverImgUrl && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img
                        src={post.coverImgUrl}
                        alt={post.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge {...getPostStatusBadge(post.status)} />
                      <span className="text-muted-foreground text-xs">
                        {formatDate(post.creationDate)}
                      </span>
                    </div>
                    <CardTitle className="line-clamp-2 text-base">
                      {post.title || t("common.noTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <p className="text-muted-foreground line-clamp-3 text-sm">
                      {post.summary || post.content || t("adminPostmanagement.noContent")}
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {post.tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        {post.likeCount ?? 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {post.commentCount ?? 0}
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2">
                      {post.postId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setView({
                              mode: "detail",
                              postId: post.postId!,
                            })
                          }>
                          <Eye className="mr-1 h-4 w-4" />
                          {t("common.detail")}
                        </Button>
                      )}
                      {post.postId && post.status === "DRAFT" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() =>
                              void updateStatus(
                                post.postId!,
                                "PUBLISHED",
                                t("adminPostmanagement.theArticleHasBeenApproved")
                              )
                            }
                            disabled={statusUpdatingId === post.postId}>
                            {t("common.browse")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              void updateStatus(post.postId!, "ARCHIVED", t("common.postRejected"))
                            }
                            disabled={statusUpdatingId === post.postId}>
                            {t("common.refuse")}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <PaginationControl
            pagination={pagination}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              pagination.goToFirstPage();
            }}
            pageSizeOptions={[6, 9, 10, 20]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
