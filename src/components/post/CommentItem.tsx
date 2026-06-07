import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { PostCommentResponse } from "@/interfaces/schema.types";
import { formatDateTime, toTimestamp } from "@/lib/formatting";
import type { TFunction } from "i18next";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
interface CommentItemProps {
  comment: PostCommentResponse;
  currentUserId?: number;
  onReply?: (_comment: PostCommentResponse) => void;
  mentionedUserName?: string;
  parentCommentId?: number;
  onMentionClick?: (_parentCommentId: number) => void;
  isHighlighted?: boolean;
}
function renderContent(
  text: string | undefined,
  mentionedUserName: string | undefined,
  parentCommentId: number | undefined,
  onMentionClick: ((_pid: number) => void) | undefined
): (string | React.ReactElement)[] {
  if (!text) return [];
  if (mentionedUserName) {
    const mention = `@${mentionedUserName}`;
    if (text.startsWith(mention)) {
      const rest = text.slice(mention.length);
      const clickable = !!(onMentionClick && parentCommentId);
      const mentionEl = (
        <span
          key="mention"
          className={`inline-flex items-center rounded-md bg-[#007BFF]/10 px-1.5 py-0.5 text-xs font-semibold text-[#007BFF]${clickable ? "cursor-pointer hover:bg-[#007BFF]/20" : ""}`}
          onClick={
            clickable
              ? (e) => {
                  e.stopPropagation();
                  onMentionClick!(parentCommentId!);
                }
              : undefined
          }>
          {mention}
        </span>
      );
      return [mentionEl, ...renderContent(rest, undefined, undefined, undefined)];
    }
  }
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) =>
    /^@\S+$/.test(part) ? (
      <span
        key={i}
        className="inline-flex items-center rounded-md bg-[#007BFF]/10 px-1.5 py-0.5 text-xs font-semibold text-[#007BFF]">
        {part}
      </span>
    ) : (
      part
    )
  );
}

function computeRelativeTime(createdAt: string | undefined, nowMs: number, t: TFunction): string {
  if (!createdAt) return "";
  const timestamp = toTimestamp(createdAt);
  if (!timestamp) return "";
  const diffMs = nowMs - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t("common.justFinished");
  if (diffMins < 60) return t("general.minutesAgo", { var_0: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t("general.hoursAgo", { var_0: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return t("general.daysAgo", { var_0: diffDays });
  const diffMonths = Math.floor(diffDays / 30);
  return t("general.monthsAgo", { var_0: diffMonths });
}

export function CommentItem({
  comment,
  onReply,
  mentionedUserName,
  parentCommentId,
  onMentionClick,
  isHighlighted,
}: CommentItemProps) {
  const { t } = useTranslation();

  const [now, setNow] = useState(() => Date.now());

  // Update relative time every 30s so display stays accurate while the feed is open
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const relativeTime = computeRelativeTime(comment.createdAt, now, t);
  const absoluteTime = formatDateTime(comment.createdAt, "");
  const initials = comment.userName
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      data-comment-id={comment.id}
      className={`flex gap-3 rounded py-3 transition-colors duration-500${isHighlighted ? "bg-[#007BFF]/10 ring-1 ring-[#007BFF]/30" : ""}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.userAvatar} alt={comment.userName} />
        <AvatarFallback>{initials || "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.userName ?? t("common.anonymous")}</span>
          {relativeTime && (
            <span title={absoluteTime || undefined} className="text-muted-foreground text-xs">
              {relativeTime}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm wrap-break-word whitespace-pre-wrap">
          {renderContent(comment.content, mentionedUserName, parentCommentId, onMentionClick)}
        </p>
        {onReply && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-6 px-2 text-xs"
            onClick={() => onReply(comment)}>
            {t("compPost.reply")}
          </Button>
        )}
      </div>
    </div>
  );
}
