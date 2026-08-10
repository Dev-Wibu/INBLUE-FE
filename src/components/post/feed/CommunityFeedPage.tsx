import { ReloadButton } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { usePostFeed } from "@/hooks/usePostFeed";
import { toTimestamp } from "@/lib/formatting";
import { useAuthStore } from "@/stores/authStore";
import { Hash, PenSquare, Search, Sparkles, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreatePostModal } from "./CreatePostModal";
import { PostFeedCard } from "./PostFeedCard";
type SortBy = "newest" | "popular" | "recent_activity";
export function CommunityFeedPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { posts, hasMore, isLoading, isReloading, isFetchingMore, loadMore, refresh } =
    usePostFeed();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const authorName = user?.name ?? t("common.friend");
  const authorInitials = authorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return posts
      .filter((item) => {
        const post = item.post;
        // Only display posts with status PUBLISHED
        const isPublished = !post?.status || post.status === "PUBLISHED";
        if (!isPublished) return false;

        const matchSearch =
          !search ||
          post?.title?.toLowerCase().includes(lower) ||
          post?.tags?.some((tag) => tag.toLowerCase().includes(lower)) ||
          false;
        return matchSearch;
      })
      .sort((a, b) => {
        if (sortBy === "popular") {
          const scoreA = (a.likeCount ?? 0) + (a.commentCount ?? 0);
          const scoreB = (b.likeCount ?? 0) + (b.commentCount ?? 0);
          return scoreB - scoreA;
        }
        if (sortBy === "recent_activity") {
          const latestComment = (items: typeof a.postComments) => {
            if (!items?.length) return 0;
            return items.reduce((latest, c) => {
              const t = toTimestamp(c.createdAt) ?? 0;
              return t > latest ? t : latest;
            }, 0);
          };
          const latestA = latestComment(a.postComments);
          const latestB = latestComment(b.postComments);
          const fallbackA = toTimestamp(a.post?.creationDate) ?? 0;
          const fallbackB = toTimestamp(b.post?.creationDate) ?? 0;
          return Math.max(latestB, fallbackB) - Math.max(latestA, fallbackA);
        }
        return 0;
      });
  }, [posts, search, sortBy]);
  const popularTopics = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((item) => {
      item.post?.tags?.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  }, [posts]);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);
  return (
    <div className="-m-4 min-h-full bg-slate-50/70 px-4 py-5 sm:-m-6 sm:px-6 lg:-m-8 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto grid w-full max-w-[1400px] gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-5">
          <section className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-white shadow-sm dark:border-indigo-500/20 dark:bg-slate-900/80">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_35%,rgba(99,102,241,0.16),transparent_60%)] dark:bg-[radial-gradient(circle_at_70%_35%,rgba(99,102,241,0.22),transparent_60%)]" />
            <div className="relative flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-7">
              <div className="max-w-2xl">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-indigo-600 uppercase dark:text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Inblue Community
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                  Nơi học hỏi, chia sẻ và tiến bộ cùng nhau.
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Khám phá những câu chuyện nghề nghiệp, kinh nghiệm phỏng vấn và kiến thức mới từ
                  cộng đồng.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800/70">
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                  {posts.length} bài viết
                </span>
              </div>
            </div>
          </section>

          <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white py-0 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-indigo-50 dark:ring-indigo-500/10">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt={authorName} />
                <AvatarFallback className="bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="min-w-[180px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
                onClick={() => setCreateModalOpen(true)}>
                {t("compPost.whatAreYouThinking")}{" "}
                {user?.name?.split(" ").pop() ?? t("general.you")}?
              </button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg border-indigo-200 px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                onClick={() => setCreateModalOpen(true)}>
                <PenSquare className="h-3.5 w-3.5" />
                <span>{t("compPost.writeArticles")}</span>
              </Button>
              <ReloadButton
                onReload={refresh}
                isLoading={isReloading}
                tooltip={t("compPost.reloadMessageBoard")}
              />
            </div>
          </Card>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t("compPost.searchForArticlesTags")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 dark:border-slate-700 dark:bg-slate-800/60"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 sm:w-44 dark:border-slate-700 dark:bg-slate-800/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("compPost.latestPost")}</SelectItem>
                  <SelectItem value="popular">{t("compPost.mostPopular")}</SelectItem>
                  <SelectItem value="recent_activity">{t("compPost.recentActivity")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800"
                />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
              {t("compPost.noSuitableArticlesWereFound")}
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="space-y-4">
              {filtered.map((item, idx) => (
                <PostFeedCard key={item.post?.postId ?? idx} item={item} />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-4" />

          {isFetchingMore && (
            <div className="flex justify-center py-4">
              <Spinner size="md" tone="muted" />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="text-muted-foreground py-4 text-center text-xs">
              {t("compPost.youHaveReadTheEntire")}
            </p>
          )}
        </main>

        <aside className="hidden space-y-5 xl:block">
          <Card className="rounded-2xl border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Chủ đề nổi bật
            </div>
            <div className="mt-4 space-y-2">
              {(popularTopics.length > 0
                ? popularTopics
                : [
                    { tag: "Lập trình", count: 0 },
                    { tag: "Phỏng vấn", count: 0 },
                    { tag: "Phát triển nghề nghiệp", count: 0 },
                  ]
              ).map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearch(tag)}
                  className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                  <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <Hash className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    <span className="truncate">{tag}</span>
                  </span>
                  {count > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl border-indigo-200/70 bg-indigo-50/70 p-5 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/[0.08]">
            <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-900 dark:text-indigo-100">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Chia sẻ có ích hơn
            </div>
            <p className="mt-3 text-xs leading-relaxed text-indigo-800/80 dark:text-indigo-200/80">
              Đặt tiêu đề rõ ràng, thêm tag phù hợp và chia sẻ những điều bạn đã thật sự trải
              nghiệm.
            </p>
          </Card>
        </aside>
      </div>

      <CreatePostModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={refresh}
      />
    </div>
  );
}
