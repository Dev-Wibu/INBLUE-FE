import { UniversalMediaUploader } from "@/components/shared/media/UniversalMediaUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { invalidatePostFeedQueries } from "@/lib/post-feed";
import { postManager } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";
import { FileText, ImagePlus, Info, PenLine, Send, Tag, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onCreated?: () => void;
}

export function CreatePostModal({ open, onOpenChange, onCreated }: CreatePostModalProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: currentMentorProfile } = useCurrentMentorProfile();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSummary("");
    setTagInput("");
    setTags([]);
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
  };

  const handleCoverFilesChange = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;

    const authorId =
      user?.role === "MENTOR" && currentMentorProfile?.id != null
        ? typeof currentMentorProfile.id === "string"
          ? parseInt(currentMentorProfile.id, 10)
          : currentMentorProfile.id
        : typeof user?.id === "number"
          ? user.id
          : user?.id != null
            ? parseInt(String(user.id), 10)
            : undefined;

    if (!authorId) return;

    setSubmitting(true);
    try {
      const response = await postManager.createPost({
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || undefined,
        authorId,
        tags: tags.length > 0 ? tags : undefined,
        coverImg: coverFile ?? undefined,
        status: "DRAFT",
      });

      if (response.success) {
        toast.success(
          t("compPost.draftSubmittedNotice", "Bài viết của bạn đã được gửi và đang chờ phê duyệt")
        );
        invalidatePostFeedQueries();
        resetForm();
        onOpenChange(false);
        onCreated?.();
      } else {
        toast.error(response.error ?? t("compPost.cannotPost", "Không thể đăng bài"));
      }
    } catch {
      toast.error(t("compPost.cannotPost", "Không thể đăng bài"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header - Fixed Top */}
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("compPost.createNewPost", "Tạo bài viết mới")}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  "compPost.shareKnowledgeNotice",
                  "Chia sẻ câu chuyện, kiến thức hoặc kinh nghiệm với cộng đồng"
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body - Scrollable Canvas */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 sm:p-8">
          {/* Cover Photo Area */}
          {coverPreview ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("common.coverPhoto", "Ảnh bìa")}
                </span>
                <div className="flex items-center gap-2">
                  <UniversalMediaUploader
                    preset="single-image"
                    enableWebcam={true}
                    onFilesChange={handleCoverFilesChange}
                    customTrigger={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 rounded-lg text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                        <ImagePlus className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                        {t("common.change", "Thay đổi ảnh")}
                      </Button>
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCoverFile(null);
                      if (coverPreview) URL.revokeObjectURL(coverPreview);
                      setCoverPreview(null);
                    }}
                    className="h-8 gap-1.5 rounded-lg border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40">
                    <X className="h-3.5 w-3.5" />
                    {t("common.delete", "Xóa ảnh")}
                  </Button>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-800">
                <img
                  src={coverPreview}
                  alt={t("common.coverPhoto", "Ảnh bìa")}
                  className="max-h-60 w-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-start">
              <UniversalMediaUploader
                preset="single-image"
                enableWebcam={true}
                onFilesChange={handleCoverFilesChange}
                customTrigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 rounded-xl border-dashed border-slate-300 bg-slate-50/50 px-3 text-xs font-medium text-slate-600 hover:border-indigo-500 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300">
                    <ImagePlus className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    {t("compPost.addCoverPhoto", "Thêm ảnh bìa")}
                  </Button>
                }
              />
            </div>
          )}

          {/* Frameless Title Input */}
          <div className="space-y-1">
            <Input
              placeholder={t("compPost.titleYourPost", "Tiêu đề bài viết...")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-auto rounded-none border-0 bg-transparent px-0 py-1 text-2xl font-extrabold tracking-tight text-slate-900 placeholder:text-slate-300 focus-visible:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="border-b border-slate-100 dark:border-slate-800" />

          {/* Main Content Area */}
          <div className="space-y-1">
            <Textarea
              placeholder={t(
                "compPost.contentPlaceholder",
                "Viết nội dung bài viết của bạn tại đây... Chia sẻ thông tin chi tiết, kiến thức hoặc câu hỏi của bạn."
              )}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="min-h-[220px] resize-y rounded-xl border-slate-200/80 bg-slate-50/40 p-4 text-base leading-relaxed text-slate-800 shadow-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 dark:border-slate-700/70 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-indigo-500 dark:focus:bg-slate-800/80"
            />
          </div>

          {/* Metadata Cards: Summary & Tags */}
          <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
            {/* Summary Section */}
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 dark:border-slate-700/70 dark:bg-slate-800/40">
              <Label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <FileText className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                {t("common.summary", "Tóm tắt ngắn (Không bắt buộc)")}
              </Label>
              <Textarea
                placeholder={t(
                  "compPost.writeABriefSummaryOptional",
                  "Nhập mô tả ngắn hiển thị trên thẻ bài viết..."
                )}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                className="resize-none rounded-lg border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-800 shadow-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-indigo-500"
              />
            </div>

            {/* Tags Section */}
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 dark:border-slate-700/70 dark:bg-slate-800/40">
              <Label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Tag className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                {t("common.tags", "Thẻ chủ đề")}
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t(
                    "compPost.enterTagThenPressEnter",
                    "Nhập thẻ (ví dụ: React, Career)..."
                  )}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="h-9 flex-1 rounded-lg border-slate-200/80 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className="h-9 rounded-lg px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  {t("common.more", "Thêm")}
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1.5 rounded-md border-0 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:border dark:border-indigo-800/50 dark:bg-indigo-950/80 dark:text-indigo-300">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="rounded p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Always Fixed Bottom */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Info className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>
              {t("compPost.approvalNotice", "Bài viết sẽ được duyệt trước khi xuất bản.")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-xl px-4 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button
              className="h-9 gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || submitting}>
              {submitting ? <Spinner size="sm" tone="white" /> : <Send className="h-3.5 w-3.5" />}
              {t("compPost.post", "Đăng bài")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
