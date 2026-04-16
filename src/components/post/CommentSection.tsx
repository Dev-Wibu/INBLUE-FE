import { ChevronDown, ChevronUp, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PostCommentResponse } from "@/interfaces/schema.types";
import { queryClient } from "@/lib/queryClient";
import { useCreateComment, usePostComments } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";

import { CommentItem } from "./CommentItem";

type CommentNode = {
  comment: PostCommentResponse;
  children: CommentNode[];
};

function buildCommentTree(comments: PostCommentResponse[]): CommentNode[] {
  const nodeMap = new Map<number, CommentNode>();
  comments.forEach((c) => {
    if (c.id != null) nodeMap.set(c.id, { comment: c, children: [] });
  });

  const roots: CommentNode[] = [];
  comments.forEach((c) => {
    const node = c.id != null ? nodeMap.get(c.id) : undefined;
    if (!node) return;
    const pid = c.parentCommentId;
    if (!pid || pid === 0) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(pid);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  return roots;
}

function flattenDescendants(node: CommentNode): PostCommentResponse[] {
  const result: PostCommentResponse[] = [];
  function dfs(children: CommentNode[]) {
    for (const child of children) {
      result.push(child.comment);
      dfs(child.children);
    }
  }
  dfs(node.children);
  result.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  return result;
}

function countAllDescendants(node: CommentNode): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countAllDescendants(child);
  }
  return count;
}

function findRootCommentId(
  commentId: number,
  commentById: Map<number, PostCommentResponse>,
  rootIds: Set<number>
): number {
  if (rootIds.has(commentId)) return commentId;
  const c = commentById.get(commentId);
  if (!c?.parentCommentId) return commentId;
  return findRootCommentId(c.parentCommentId, commentById, rootIds);
}

interface ReplyInputProps {
  userName: string;
  value: string;
  onChange: (_v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function ReplyInput({ userName, value, onChange, onSubmit, onCancel }: ReplyInputProps) {
  return (
    <div className="mt-2 flex flex-col gap-1.5 pl-11">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">Đang trả lời</span>
        <span className="rounded bg-[#007BFF]/10 px-1.5 py-0.5 text-xs font-semibold text-[#007BFF]">
          @{userName}
        </span>
      </div>
      <div className="flex gap-2">
        <Textarea
          autoFocus
          placeholder="Trả lời... (Ctrl+Enter để gửi)"
          value={value}
          rows={2}
          className="max-h-32 flex-1 resize-none overflow-auto"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) onSubmit();
          }}
        />
        <div className="flex flex-col gap-1">
          <Button size="sm" onClick={onSubmit} disabled={!value.trim()}>
            <Send className="mr-1 h-4 w-4" />
            Gửi
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Hủy
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CommentThreadProps {
  node: CommentNode;
  currentUserId?: number;
  replyingToId: number | null;
  replyContent: string;
  onSetReplyingId: (_id: number | null) => void;
  onReplyContentChange: (_v: string) => void;
  onReplySubmit: (_parentCommentId: number) => void;
  expandedIds: Set<number>;
  onToggleExpand: (_id: number) => void;
  commentById: Map<number, PostCommentResponse>;
  highlightedCommentId: number | null;
  onMentionClick: (_parentCommentId: number) => void;
  depth?: number;
}

function CommentThread({
  node,
  currentUserId,
  replyingToId,
  replyContent,
  onSetReplyingId,
  onReplyContentChange,
  onReplySubmit,
  expandedIds,
  onToggleExpand,
  commentById,
  highlightedCommentId,
  onMentionClick,
  depth = 0,
}: CommentThreadProps) {
  const { comment } = node;
  const isExpanded = comment.id != null && expandedIds.has(comment.id);
  const isReplyingToThis = replyingToId === comment.id;

  const maxDepth = 2;
  const atMaxDepth = depth >= maxDepth;
  const flatChildren = useMemo(
    () => (atMaxDepth ? flattenDescendants(node) : []),
    [node, atMaxDepth]
  );
  const directChildren = atMaxDepth ? [] : node.children;
  const totalReplies = atMaxDepth ? flatChildren.length : countAllDescendants(node);

  return (
    <div>
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        onReply={(c) => {
          onSetReplyingId(c.id ?? null);
          onReplyContentChange("");
        }}
        mentionedUserName={
          depth > 0 && comment.parentCommentId
            ? commentById.get(comment.parentCommentId)?.userName
            : undefined
        }
        parentCommentId={depth > 0 ? comment.parentCommentId : undefined}
        isHighlighted={highlightedCommentId === comment.id}
        onMentionClick={onMentionClick}
      />

      {isReplyingToThis && (
        <ReplyInput
          userName={comment.userName ?? ""}
          value={replyContent}
          onChange={onReplyContentChange}
          onSubmit={() => comment.id != null && onReplySubmit(comment.id)}
          onCancel={() => {
            onSetReplyingId(null);
            onReplyContentChange("");
          }}
        />
      )}

      {totalReplies > 0 && (
        <div
          className={
            depth < maxDepth
              ? "ml-11 border-l border-slate-200 pl-3 dark:border-slate-700"
              : "ml-6 border-l border-slate-200 pl-3 dark:border-slate-700"
          }>
          {!isExpanded ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1 text-xs"
              onClick={() => comment.id != null && onToggleExpand(comment.id)}>
              <ChevronDown className="h-3.5 w-3.5" />
              Xem {totalReplies} phản hồi
            </Button>
          ) : (
            <>
              {atMaxDepth
                ? flatChildren.map((reply) => {
                    const isReplyingToReply = replyingToId === reply.id;
                    return (
                      <div key={reply.id}>
                        <CommentItem
                          comment={reply}
                          currentUserId={currentUserId}
                          onReply={(c) => {
                            onSetReplyingId(c.id ?? null);
                            onReplyContentChange("");
                          }}
                          mentionedUserName={
                            reply.parentCommentId
                              ? commentById.get(reply.parentCommentId)?.userName
                              : undefined
                          }
                          parentCommentId={reply.parentCommentId}
                          isHighlighted={highlightedCommentId === reply.id}
                          onMentionClick={onMentionClick}
                        />
                        {isReplyingToReply && (
                          <ReplyInput
                            userName={reply.userName ?? ""}
                            value={replyContent}
                            onChange={onReplyContentChange}
                            onSubmit={() => reply.id != null && onReplySubmit(reply.id)}
                            onCancel={() => {
                              onSetReplyingId(null);
                              onReplyContentChange("");
                            }}
                          />
                        )}
                      </div>
                    );
                  })
                : directChildren.map((child) => (
                    <CommentThread
                      key={child.comment.id}
                      node={child}
                      currentUserId={currentUserId}
                      replyingToId={replyingToId}
                      replyContent={replyContent}
                      onSetReplyingId={onSetReplyingId}
                      onReplyContentChange={onReplyContentChange}
                      onReplySubmit={onReplySubmit}
                      expandedIds={expandedIds}
                      onToggleExpand={onToggleExpand}
                      commentById={commentById}
                      highlightedCommentId={highlightedCommentId}
                      onMentionClick={onMentionClick}
                      depth={depth + 1}
                    />
                  ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1 text-xs"
                onClick={() => comment.id != null && onToggleExpand(comment.id)}>
                <ChevronUp className="h-3.5 w-3.5" />
                Thu gọn
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface CommentSectionProps {
  postId: number;
  externalComments?: PostCommentResponse[];
  onExternalInvalidate?: () => void;
  hideInput?: boolean;
  allowDelete?: boolean;
  onDeleteComment?: (_commentId: number) => void;
}

export function CommentSection({
  postId,
  externalComments,
  onExternalInvalidate,
  hideInput = false,
  allowDelete = false,
  onDeleteComment,
}: CommentSectionProps) {
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  const { data: commentsData } = usePostComments(postId, !externalComments);
  const createComment = useCreateComment();

  const commentTree = useMemo(() => {
    const comments: PostCommentResponse[] =
      externalComments ??
      (Array.isArray(commentsData)
        ? commentsData
        : (commentsData as unknown as PostCommentResponse[])) ??
      [];
    return buildCommentTree(comments);
  }, [externalComments, commentsData]);

  const commentById = useMemo(() => {
    const map = new Map<number, PostCommentResponse>();
    function addToMap(nodes: CommentNode[]) {
      for (const n of nodes) {
        if (n.comment.id != null) map.set(n.comment.id, n.comment);
        addToMap(n.children);
      }
    }
    addToMap(commentTree);
    return map;
  }, [commentTree]);

  const rootIds = useMemo(
    () => new Set(commentTree.map((n) => n.comment.id).filter((id): id is number => id != null)),
    [commentTree]
  );

  const [newContent, setNewContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest");
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["postComments", postId] });
    queryClient.invalidateQueries({ queryKey: ["postCommentsCount", postId] });
  };

  const handleCommentSubmit = () => {
    const content = newContent.trim();
    if (!content || !currentUserId) return;

    createComment.mutate({ body: { postId, userId: currentUserId, content } } as never, {
      onSuccess: () => {
        setNewContent("");
        if (onExternalInvalidate) {
          onExternalInvalidate();
        } else {
          invalidate();
        }
      },
      onError: () => toast.error("Không thể gửi bình luận"),
    });
  };

  const handleReplySubmit = (parentCommentId: number) => {
    const content = replyContent.trim();
    if (!content || !currentUserId) return;

    const parentUser = commentById.get(parentCommentId)?.userName;
    const contentWithMention = parentUser ? `@${parentUser} ${content}` : content;

    createComment.mutate(
      {
        body: {
          postId,
          userId: currentUserId,
          content: contentWithMention,
          parentCommentId,
        },
      } as never,
      {
        onSuccess: () => {
          setReplyingToId(null);
          setReplyContent("");

          const rootId = findRootCommentId(parentCommentId, commentById, rootIds);
          setExpandedIds((prev) => new Set(prev).add(rootId));

          if (onExternalInvalidate) {
            onExternalInvalidate();
          } else {
            invalidate();
          }
        },
        onError: () => toast.error("Không thể gửi phản hồi"),
      }
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMentionClick = (parentCommentId: number) => {
    const el = document.querySelector(`[data-comment-id="${parentCommentId}"]`);
    if (el) {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedCommentId(parentCommentId);
      window.setTimeout(
        () => setHighlightedCommentId((prev) => (prev === parentCommentId ? null : prev)),
        1400
      );
    }
  };

  const sortedRoots = useMemo(() => {
    const arr = [...commentTree];
    arr.sort((a, b) => {
      const tA = a.comment.createdAt ? new Date(a.comment.createdAt).getTime() : 0;
      const tB = b.comment.createdAt ? new Date(b.comment.createdAt).getTime() : 0;
      return sortOrder === "newest" ? tB - tA : tA - tB;
    });
    return arr;
  }, [commentTree, sortOrder]);

  const flatComments = useMemo(() => {
    const values = Array.from(commentById.values());
    values.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
    return values;
  }, [commentById]);

  return (
    <div className="space-y-3">
      {!hideInput && (
        <div className="flex gap-2">
          <Textarea
            placeholder="Viết bình luận... (Ctrl+Enter để gửi)"
            value={newContent}
            rows={2}
            className="max-h-32 flex-1 resize-none overflow-auto"
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleCommentSubmit();
            }}
          />
          <Button
            className="self-end"
            onClick={handleCommentSubmit}
            disabled={!newContent.trim() || createComment.isPending}>
            <Send className="mr-1 h-4 w-4" />
            Gửi
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Bình luận ({flatComments.length})</p>
        <div className="flex items-center gap-2">
          <Button
            variant={sortOrder === "oldest" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortOrder("oldest")}>
            Cũ nhất
          </Button>
          <Button
            variant={sortOrder === "newest" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortOrder("newest")}>
            Mới nhất
          </Button>
        </div>
      </div>

      {sortedRoots.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">Chưa có bình luận</p>
      ) : (
        <div className="space-y-1">
          {sortedRoots.map((node) => (
            <CommentThread
              key={node.comment.id}
              node={node}
              currentUserId={currentUserId}
              replyingToId={replyingToId}
              replyContent={replyContent}
              onSetReplyingId={setReplyingToId}
              onReplyContentChange={setReplyContent}
              onReplySubmit={handleReplySubmit}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              commentById={commentById}
              highlightedCommentId={highlightedCommentId}
              onMentionClick={handleMentionClick}
            />
          ))}
        </div>
      )}

      {allowDelete && onDeleteComment && flatComments.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Quản trị bình luận</p>
          {flatComments.map((comment) => (
            <div
              key={comment.id}
              className="flex items-start justify-between rounded-lg border p-3 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium">{comment.userName || "Ẩn danh"}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">{comment.content}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => comment.id && onDeleteComment(comment.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
