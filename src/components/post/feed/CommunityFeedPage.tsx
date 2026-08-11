import { ReloadButton } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { chatManager } from "@/services/chat.manager";
import { useAuthStore } from "@/stores/authStore";
import { MessageCircle, MoreHorizontal, PenSquare, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CreatePostModal } from "./CreatePostModal";
import { PostFeedCard } from "./PostFeedCard";
type SortBy = "newest" | "popular" | "recent_activity";
export function CommunityFeedPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { posts, hasMore, isLoading, isReloading, isFetchingMore, loadMore, refresh } =
    usePostFeed();
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
    return posts
      .filter((item) => {
        const post = item.post;
        // Only display posts with status PUBLISHED
        const isPublished = !post?.status || post.status === "PUBLISHED";
        return isPublished;
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
  }, [posts, sortBy]);
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
      <div className="mx-auto grid w-full max-w-[1280px] gap-5 xl:grid-cols-[minmax(0,940px)_260px]">
        <main className="min-w-0 space-y-5">
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

          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Bài viết cộng đồng
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Cập nhật mới nhất từ mọi người
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger className="h-9 w-40 rounded-lg border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-900/80">
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

        <CommunityChatRail />
      </div>

      <CreatePostModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreated={refresh}
      />
    </div>
  );
}

interface CommunityChatContact {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: "USER" | "MENTOR";
}

function CommunityChatRail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [contacts, setContacts] = useState<CommunityChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<CommunityChatContact | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadContacts = async () => {
      if (user?.id == null) return;
      const response = await chatManager.getContacts(Number(user.id), user.role ?? "USER");
      if (!response.success || !response.data) return;

      const isUser = (user.role ?? "USER").toUpperCase() === "USER";
      const detailResults = await Promise.all(
        response.data.slice(0, 8).map(async (id) => {
          const detail = isUser
            ? await chatManager.getMentorDetail(id)
            : await chatManager.getUserDetail(id);
          if (!detail.success || !detail.data || detail.data.id == null || !detail.data.name) {
            return null;
          }
          return {
            id: Number(detail.data.id),
            name: detail.data.name,
            avatarUrl: detail.data.avatarUrl ?? null,
            role: isUser ? "MENTOR" : "USER",
          } satisfies CommunityChatContact;
        })
      );

      if (!cancelled) {
        setContacts(detailResults.filter((contact): contact is CommunityChatContact => !!contact));
      }
    };

    void loadContacts();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  return (
    <aside className="hidden xl:block">
      <Card className="sticky top-5 h-fit rounded-2xl border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <MessageCircle className="h-4 w-4 text-indigo-500" />
            {t("common.messages", "Tin nhắn")}
          </div>
          <button
            type="button"
            aria-label="Mở Messenger"
            onClick={() => navigate("/user?tab=messenger")}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-300">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-0.5">
          {contacts.length > 0 ? (
            contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => setSelectedContact(contact)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                <span className="relative shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={contact.avatarUrl ?? undefined} alt={contact.name} />
                    <AvatarFallback className="bg-indigo-500/10 text-xs font-bold text-indigo-600">
                      {contact.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                </span>
                <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {contact.name}
                </span>
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={() => navigate("/user?tab=messenger")}
              className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-xs text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10">
              {t("sharedMessenger.noContacts", "Chưa có cuộc trò chuyện")}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/user?tab=messenger")}
          className="mt-3 w-full border-t border-slate-200 pt-3 text-center text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:border-slate-800 dark:text-indigo-300 dark:hover:text-indigo-200">
          Xem tất cả tin nhắn
        </button>
      </Card>

      {selectedContact && (
        <CommunityChatWindow
          contact={selectedContact}
          currentUserId={Number(user?.id ?? 0)}
          currentUserRole={(user?.role ?? "USER").toUpperCase()}
          onClose={() => setSelectedContact(null)}
          onOpenMessenger={() => navigate("/user?tab=messenger")}
        />
      )}
    </aside>
  );
}

interface CommunityChatWindowProps {
  contact: CommunityChatContact;
  currentUserId: number;
  currentUserRole: string;
  onClose: () => void;
  onOpenMessenger: () => void;
}

interface FloatingChatMessage {
  id: string | number;
  content: string;
  isMine: boolean;
}

function CommunityChatWindow({
  contact,
  currentUserId,
  currentUserRole,
  onClose,
  onOpenMessenger,
}: CommunityChatWindowProps) {
  const [messages, setMessages] = useState<FloatingChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      if (!currentUserId) return;
      const response = await chatManager.getChatHistoryByParticipants(
        `${currentUserRole}_${currentUserId}`,
        `${contact.role}_${contact.id}`
      );
      if (!response.success || !response.data || cancelled) return;
      setMessages(
        response.data.slice(-8).map((message) => ({
          id: message.id ?? `${message.timestamp ?? "message"}-${message.content}`,
          content: message.content ?? "",
          isMine: String(message.senderType ?? "").toUpperCase() === currentUserRole.toUpperCase(),
        }))
      );
    };
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [contact, currentUserId, currentUserRole]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content) return;
    setMessages((previous) => [...previous, { id: `local-${Date.now()}`, content, isMine: true }]);
    setDraft("");
  };

  return (
    <div className="fixed right-5 bottom-5 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <span className="relative shrink-0">
          <Avatar className="h-9 w-9 ring-2 ring-indigo-500/15">
            <AvatarImage src={contact.avatarUrl ?? undefined} alt={contact.name} />
            <AvatarFallback className="bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-300">
              {contact.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
        </span>
        <button type="button" onClick={onOpenMessenger} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {contact.name}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Đang hoạt động</p>
        </button>
        <button
          type="button"
          aria-label="Đóng cuộc trò chuyện"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex h-56 flex-col gap-2 overflow-y-auto bg-slate-50/70 px-3 py-3 dark:bg-slate-950/60">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                message.isMine
                  ? "self-end rounded-br-md bg-indigo-600 text-white"
                  : "rounded-bl-md bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200"
              }`}>
              {message.content}
            </div>
          ))
        ) : (
          <div className="m-auto text-center text-xs text-slate-400">
            Bắt đầu cuộc trò chuyện với {contact.name}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSend();
          }}
          placeholder="Nhập tin nhắn..."
          className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs transition-colors outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="button"
          aria-label="Gửi tin nhắn"
          onClick={handleSend}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-500">
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
