import { UniversalMediaUploader } from "@/components/shared/media/UniversalMediaUploader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ImagePlus, PenLine, Send, Tag, X } from "lucide-react";
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
  const authorName = user?.name ?? t("common.friend");
  const authorInitials = authorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
    // User.id from JWT (sub) is NOT the same as Mentor.id. For MENTOR role,
    // BE stores posts against Mentor.id.
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
        toast.error(response.error ?? t("compPost.cannotPost"));
      }
    } catch {
      toast.error(t("compPost.cannotPost"));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-hidden border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700/80 dark:bg-slate-900">
        <DialogHeader className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 text-left dark:border-slate-800 dark:bg-slate-800/45">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/25">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-slate-950 dark:text-white">
                {t("common.createArticles")}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Chia sẻ một điều hữu ích với cộng đồng Inblue.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(90vh-92px)] space-y-5 overflow-y-auto px-6 pt-5 pb-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/45">
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-slate-100 dark:ring-slate-800">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={authorName} />
              <AvatarFallback className="bg-[#0047AB]/10 text-sm font-semibold text-[#0047AB]">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{authorName}</p>
              <Badge
                variant="secondary"
                className="mt-0.5 border-0 bg-indigo-500/10 text-[10px] text-indigo-600 dark:text-indigo-300">
                {t("compPost.posted")}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {t("common.title1")}
            </Label>
            <Input
              placeholder={t("compPost.titleYourPost")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-slate-50 text-base font-semibold dark:border-slate-700 dark:bg-slate-800/60"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {t("common.content1")}
            </Label>
            <Textarea
              placeholder={t("general.heyWhatSOnYour", {
                var_0: user?.name?.split(" ").pop() ?? t("common.friend"),
              })}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              className="resize-none rounded-xl border-slate-200 bg-slate-50 leading-relaxed dark:border-slate-700 dark:bg-slate-800/60"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {t("common.summary")}
            </Label>
            <Textarea
              placeholder={t("compPost.writeABriefSummaryOptional")}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="resize-none rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
            />
          </div>

          <div>
            {coverPreview ? (
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={coverPreview}
                  alt={t("common.coverPhoto")}
                  className="h-52 w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  onClick={() => {
                    setCoverFile(null);
                    if (coverPreview) URL.revokeObjectURL(coverPreview);
                    setCoverPreview(null);
                  }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <UniversalMediaUploader
                preset="single-image"
                enableWebcam={true}
                onFilesChange={handleCoverFilesChange}
                customTrigger={
                  <div className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-indigo-500/60 dark:hover:bg-indigo-500/10">
                    <ImagePlus className="h-6 w-6 text-slate-400" />
                    <span className="text-muted-foreground text-sm">
                      {t("compPost.addCoverPhoto")}
                    </span>
                  </div>
                }
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              <Tag className="mr-1 inline h-3 w-3" />
              {t("common.tags")}
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder={t("compPost.enterTagThenPressEnter")}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="h-10 flex-1 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}>
                {t("common.more")}
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pr-1 text-[#0047AB] dark:text-[#66B2FF]">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-muted rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-6 pt-4 pb-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}>
              Hủy
            </Button>
            <Button
              className="h-10 gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white shadow-sm shadow-indigo-500/25 hover:bg-indigo-700"
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || submitting}>
              {submitting ? <Spinner size="sm" tone="white" /> : <Send className="h-4 w-4" />}
              {t("compPost.post")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
