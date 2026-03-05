import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PostCommentResponse } from "@/interfaces/schema.types";
import { queryClient } from "@/lib/queryClient";
import { useCreateComment, usePostComments } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";

import { CommentItem } from "./CommentItem";

// ---------------------------------------------------------------------------
// Comment tree helpers
// ---------------------------------------------------------------------------

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
        // Parent not in this batch — treat as root
        roots.push(node);
      }
    }
  });

  return roots;
}

// Indent per depth level — each level adds the same border+padding class so DOM nesting
// creates natural visual hierarchy. Depth 3+ gets no additional margin, keeping deeply
// nested replies at the same visual level as depth 2.
const INDENT_CLASS = "ml-6 border-l border-slate-200 pl-3 dark:border-slate-700";
const INDENT_CLASSES = ["", INDENT_CLASS, INDENT_CLASS, ""];

// Count all descendants recursively (not just direct children)
function countDescendants(node: CommentNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

// ---------------------------------------------------------------------------
// CommentThread — recursive component
// ---------------------------------------------------------------------------

interface CommentThreadProps {
  node: CommentNode;
  depth: number;
  currentUserId?: number;
  replyingToId: number | null;
  replyContent: string;
  onSetReplyingId: (_id: number | null) => void;
  onReplyContentChange: (_v: string) => void;
  onReplySubmit: (_parentCommentId: number) => void;
  expandedIds: Set<number>;
  onToggleExpand: (_id: number) => void;
}

function CommentThread({
  node,
  depth,
  currentUserId,
  replyingToId,
  replyContent,
  onSetReplyingId,
  onReplyContentChange,
  onReplySubmit,
  expandedIds,
  onToggleExpand,
}: CommentThreadProps) {
  const { comment, children } = node;
  const indentClass = INDENT_CLASSES[Math.min(depth, 3)];
  const isReplying = replyingToId === comment.id;
  const isExpanded = comment.id != null && expandedIds.has(comment.id);

  return (
    <div className={indentClass}>
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        onReply={(c) => {
          onSetReplyingId(c.id ?? null);
          onReplyContentChange(""); // content starts empty; @username shown as visual prefix
        }}
      />

      {/* Reply input — @username badge header + multiline textarea */}
      {isReplying && (
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Đang trả lời</span>
            <span className="rounded bg-[#007BFF]/10 px-1.5 py-0.5 text-xs font-semibold text-[#007BFF]">
              @{comment.userName ?? ""}
            </span>
          </div>
          <div className="flex gap-2">
            <Textarea
              autoFocus
              placeholder="Trả lời... (Ctrl+Enter để gửi)"
              value={replyContent}
              rows={2}
              className="max-h-32 flex-1 resize-none overflow-auto"
              onChange={(e) => onReplyContentChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey && comment.id != null) {
                  onReplySubmit(comment.id);
                }
              }}
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={() => comment.id != null && onReplySubmit(comment.id)}
                disabled={!replyContent.trim()}>
                <Send className="mr-1 h-4 w-4" />
                Gửi
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onSetReplyingId(null);
                  onReplyContentChange("");
                }}>
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible children */}
      {children.length > 0 && (
        <>
          {!isExpanded ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => comment.id != null && onToggleExpand(comment.id)}>
              Xem {countDescendants(node)} phản hồi
            </Button>
          ) : (
            <>
              {children.map((child) => (
                <CommentThread
                  key={child.comment.id}
                  node={child}
                  depth={depth + 1}
                  currentUserId={currentUserId}
                  replyingToId={replyingToId}
                  replyContent={replyContent}
                  onSetReplyingId={onSetReplyingId}
                  onReplyContentChange={onReplyContentChange}
                  onReplySubmit={onReplySubmit}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => comment.id != null && onToggleExpand(comment.id)}>
                Thu gọn
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommentSection — public component
// ---------------------------------------------------------------------------

interface CommentSectionProps {
  postId: number;
  /** When provided (from PostFeedModal via usePostById), skips the internal usePostComments fetch */
  externalComments?: PostCommentResponse[];
  /** When provided, called instead of internal invalidation after any mutation */
  onExternalInvalidate?: () => void;
  /** When true, hides the main comment input box (used by PostFeedModal sticky bottom bar) */
  hideInput?: boolean;
}

export function CommentSection({
  postId,
  externalComments,
  onExternalInvalidate,
  hideInput = false,
}: CommentSectionProps) {
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  // Only fetch from API when no external comments are supplied (community PostDetailPage context)
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

  const [newContent, setNewContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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
        if (onExternalInvalidate) onExternalInvalidate();
        else invalidate();
      },
      onError: () => toast.error("Không thể gửi bình luận"),
    });
  };

  const handleReplySubmit = (parentCommentId: number) => {
    const rawContent = replyContent.trim();
    if (!rawContent || !currentUserId) return;

    // Find the parent comment to prepend @username so replies are traceable in thread
    function findComment(nodes: CommentNode[], id: number): PostCommentResponse | undefined {
      for (const n of nodes) {
        if (n.comment.id === id) return n.comment;
        const found = findComment(n.children, id);
        if (found) return found;
      }
    }
    const parentComment = findComment(commentTree, parentCommentId);
    const content = parentComment?.userName
      ? `@${parentComment.userName} ${rawContent}`
      : rawContent;

    createComment.mutate(
      { body: { postId, userId: currentUserId, content, parentCommentId } } as never,
      {
        onSuccess: () => {
          setReplyContent("");
          setReplyingToId(null);
          // Auto-expand the parent thread so the new reply is immediately visible
          setExpandedIds((prev) => new Set(prev).add(parentCommentId));
          if (onExternalInvalidate) onExternalInvalidate();
          else invalidate();
        },
        onError: () => toast.error("Không thể gửi phản hồi"),
      }
    );
  };

  const handleToggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Bình luận</h3>

      {commentTree.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có bình luận nào</p>
      ) : (
        <div className="space-y-1 divide-y">
          {commentTree.map((node) => (
            <CommentThread
              key={node.comment.id}
              node={node}
              depth={0}
              currentUserId={currentUserId}
              replyingToId={replyingToId}
              replyContent={replyContent}
              onSetReplyingId={setReplyingToId}
              onReplyContentChange={setReplyContent}
              onReplySubmit={handleReplySubmit}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </div>
      )}

      {/* Main comment input — hidden when parent provides its own sticky input */}
      {!hideInput && (
        <div className="flex gap-2">
          <Textarea
            placeholder="Viết bình luận... (Ctrl+Enter để gửi)"
            value={newContent}
            rows={2}
            className="max-h-32 resize-none overflow-auto"
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleCommentSubmit();
            }}
          />
          <Button
            size="sm"
            className="self-end"
            onClick={handleCommentSubmit}
            disabled={!newContent.trim()}>
            <Send className="mr-1 h-4 w-4" />
            Gửi
          </Button>
        </div>
      )}
    </div>
  );
}
