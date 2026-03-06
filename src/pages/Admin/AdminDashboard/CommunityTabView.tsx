import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/hooks/usePagination";
import type { Post } from "@/interfaces/schema.types";
import { extractDataArray } from "@/lib/utils";
import { postManager } from "@/services/post.manager";

import { CreatePostPage } from "../../User/Community/CreatePostPage";
import { EditPostPage } from "../../User/Community/EditPostPage";
import { PostCard } from "../../User/Community/components/PostCard";
import { CommunityPostDetail } from "./CommunityPostDetail";

type ViewState =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "detail"; postId: number }
  | { mode: "edit"; postId: number };

export function CommunityTabView() {
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState("");
  const [majorFilter, setMajorFilter] = useState("all");

  const fetchPosts = async () => {
    setLoading(true);
    const result = await postManager.getPublished();
    if (result.success && result.data) {
      setPosts(extractDataArray<Post>(result));
    }
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await postManager.getPublished();
      if (result.success && result.data) {
        setPosts(extractDataArray<Post>(result));
      }
      setLoading(false);
    };
    void load();
  }, []);

  const allMajors = [
    ...new Set(posts.map((p) => p.major?.name || p.major?.majorName).filter(Boolean)),
  ] as string[];

  const filtered = useMemo(() => {
    return posts
      .filter((p) => {
        if (tagFilter && !p.tags?.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase()))) {
          return false;
        }
        if (majorFilter !== "all" && (p.major?.name || p.major?.majorName) !== majorFilter) {
          return false;
        }
        return true;
      })
      .reverse();
  }, [posts, tagFilter, majorFilter]);

  const [pageSize, setPageSize] = useState(9);
  const pagination = usePagination({ totalCount: filtered.length, pageSize });
  const pageData = useMemo(
    () => filtered.slice(pagination.startIndex, pagination.endIndex + 1),
    [filtered, pagination.startIndex, pagination.endIndex]
  );

  if (view.mode === "create") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView({ mode: "list" })}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Quay lại danh sách
        </Button>
        <CreatePostPage
          onSuccess={() => {
            setView({ mode: "list" });
            fetchPosts();
          }}
          onCancel={() => setView({ mode: "list" })}
        />
      </div>
    );
  }

  if (view.mode === "edit") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView({ mode: "list" })}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Quay lại danh sách
        </Button>
        <EditPostPage
          postId={String(view.postId)}
          onSuccess={() => {
            setView({ mode: "list" });
            fetchPosts();
          }}
          onCancel={() => setView({ mode: "list" })}
        />
      </div>
    );
  }

  if (view.mode === "detail") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView({ mode: "list" })}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Quay lại danh sách
        </Button>
        <CommunityPostDetail
          postId={view.postId}
          onEdit={(id) => setView({ mode: "edit", postId: id })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cộng đồng</h1>
          <p className="text-muted-foreground">Bài viết</p>
        </div>
        <Button onClick={() => setView({ mode: "create" })}>
          <Plus className="mr-1 h-4 w-4" />
          Tạo bài viết mới
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Lọc theo thẻ..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="w-48"
        />
        <Select value={majorFilter} onValueChange={setMajorFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Chuyên ngành" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
            {allMajors.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">Chưa có bài viết nào</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pageData.map((post) => (
              <PostCard
                key={post.postId}
                post={post}
                onClick={() => post.postId && setView({ mode: "detail", postId: post.postId })}
              />
            ))}
          </div>
          {filtered.length > pageSize && (
            <PaginationControl pagination={pagination} onPageSizeChange={setPageSize} />
          )}
        </>
      )}
    </div>
  );
}
