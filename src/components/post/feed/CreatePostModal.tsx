import { UniversalMediaUploader } from "@/components/shared/media/UniversalMediaUploader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { invalidatePostFeedQueries } from "@/lib/post-feed";
import { postManager } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";
import { ImagePlus, Send, Tag, X } from "lucide-react";
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
    if (!title.trim() || !content.trim() || !user?.id) return;
    setSubmitting(true);
    try {
      const response = await postManager.createPost({
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || undefined,
        authorId: user.id as number,
        tags: tags.length > 0 ? tags : undefined,
        coverImg: coverFile ?? undefined,
        status: "DRAFT",
      });
      if (response.success) {
        toast.success(t("compPost.postedSuccessfully"));
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
      <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-5 pb-4">
          <DialogTitle className="text-center text-lg">{t("common.createArticles")}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-73px)] space-y-4 overflow-y-auto px-6 pt-2 pb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-slate-100 dark:ring-slate-800">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={authorName} />
              <AvatarFallback className="bg-[#0047AB]/10 text-sm font-semibold text-[#0047AB]">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{authorName}</p>
              <Badge variant="secondary" className="mt-0.5 text-[10px]">
                {t("compPost.posted")}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">{t("common.title1")}</Label>
            <Input
              placeholder={t("compPost.titleYourPost")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">{t("common.content1")}</Label>
            <Textarea
              placeholder={t("general.heyWhatSOnYour", {
                var_0: user?.name?.split(" ").pop() ?? t("common.friend"),
              })}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">{t("common.summary")}</Label>
            <Textarea
              placeholder={t("compPost.writeABriefSummaryOptional")}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div>
            {coverPreview ? (
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={coverPreview}
                  alt={t("common.coverPhoto")}
                  className="h-44 w-full rounded-lg object-cover"
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
                  <div className="border-muted hover:bg-muted/50 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 transition-colors">
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
            <Label className="text-xs font-medium text-slate-500">
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
                className="flex-1"
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

          <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-0 -mx-6 border-t px-6 pt-4 pb-2 backdrop-blur">
            <Button
              className="w-full gap-2 bg-[#0047AB] hover:bg-[#003580]"
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
