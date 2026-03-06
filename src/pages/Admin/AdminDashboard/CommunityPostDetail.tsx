import { Edit } from "lucide-react";
import { useState } from "react";

import { formatDate } from "@/lib/formatting";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePostById } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";

import { CommentSection } from "../../User/Community/components/CommentSection";
import { LikeButton } from "../../User/Community/components/LikeButton";
import { LikeListModal } from "../../User/Community/components/LikeListModal";

interface CommunityPostDetailProps {
  postId: number;
  onEdit: (postId: number) => void;
}

export function CommunityPostDetail({ postId, onEdit }: CommunityPostDetailProps) {
  const { user } = useAuthStore();
  const [likeModalOpen, setLikeModalOpen] = useState(false);

  const { data, isLoading } = usePostById(postId);
  const post = data?.post;

  if (isLoading) {
    return <p className="text-muted-foreground">Đang tải bài viết...</p>;
  }

  if (!post) {
    return <p className="text-muted-foreground">Không tìm thấy bài viết</p>;
  }

  const authorInitials = post.author?.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isOwner = !!user?.name && post.author?.name === user.name;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-end">
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => post.postId && onEdit(post.postId)}>
            <Edit className="mr-1 h-4 w-4" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      <Card>
        {post.coverImgUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img src={post.coverImgUrl} alt={post.title} className="h-full w-full object-cover" />
          </div>
        )}
        <CardHeader>
          <h1 className="text-2xl font-bold">{post.title}</h1>
          <div className="flex items-center gap-3 pt-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.author?.avatar} alt={post.author?.name} />
              <AvatarFallback>{authorInitials || "?"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{post.author?.name ?? "Ẩn danh"}</p>
              <p className="text-muted-foreground text-xs">{formatDate(post.creationDate)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 pt-2">
            {post.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {post.majorName && (
              <Badge variant="outline" className="text-xs">
                {post.majorName}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {post.summary && <p className="text-muted-foreground italic">{post.summary}</p>}
          <div className="whitespace-pre-wrap">{post.content}</div>

          <div className="flex items-center gap-2 border-t pt-4">
            {user?.id && post.postId && <LikeButton postId={post.postId} userId={user.id} />}
            {post.postId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                onClick={() => setLikeModalOpen(true)}>
                Xem ai đã thích
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {post.postId && <CommentSection postId={post.postId} />}

      {post.postId && (
        <LikeListModal postId={post.postId} open={likeModalOpen} onOpenChange={setLikeModalOpen} />
      )}
    </div>
  );
}
