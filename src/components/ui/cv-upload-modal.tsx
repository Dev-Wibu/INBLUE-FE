import { PdfPreviewViewer } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { FileText, Upload, X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
export interface CVUploadModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current CV URL (for displaying existing CV) */
  currentCvUrl?: string | null;
  /** Current CV file name */
  currentCvName?: string | null;
  /** Callback when CV is uploaded successfully */
  onUpload: (file: File) => Promise<void>;
  /** Optional callback when existing CV is viewed */
  onViewCurrent?: () => void;
  /** Whether upload is in progress */
  isUploading?: boolean;
  /** Title for the modal */
  title?: string;
  /** Description for the modal */
  description?: string;
}

/**
 * CVUploadModal - Modal chuyên dùng để upload và preview CV PDF
 *
 * Features:
 * - Chỉ accept file PDF
 * - Preview PDF file đã chọn
 * - Hiển thị CV hiện tại nếu có
 * - Loading state khi upload
 * - Validation file type
 */
export function CVUploadModal({
  isOpen,
  onOpenChange,
  currentCvUrl,
  currentCvName,
  onUpload,
  isUploading = false,
  title,
  description,
}: CVUploadModalProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("common.uploadCv");
  const resolvedDescription = description ?? t("compUi.selectYourCvFileOnly");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Clear selected file function
  const clearState = React.useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      clearState();
    }
  }, [isOpen, clearState]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;

    // Validate file type - only PDF allowed
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      setError(t("compUi.onlyAcceptPdfFilesPlease"));
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError(t("compUi.fileIsTooLargeMaximum"));
      return;
    }
    setSelectedFile(file);
  };

  // Handle clear button click
  const handleClear = () => {
    clearState();
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await onUpload(selectedFile);
      clearState();
      onOpenChange(false);
    } catch {
      setError(t("compUi.anErrorOccurredWhileUploading"));
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto px-1">
          {/* Current CV Section */}
          {currentCvUrl && !selectedFile && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("common.currentCv")}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="max-w-[200px] truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {currentCvName || "CV.pdf"}
                    </p>
                    <p className="text-xs text-slate-500">{t("compUi.pdfDocuments")}</p>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" className="w-full sm:w-auto shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40">
                      <FileText className="mr-2 h-4 w-4" />
                      {t("common.viewCv")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] w-[90vw] max-w-5xl overflow-hidden p-0">
                    <div className="h-[85vh] w-full bg-slate-100 dark:bg-slate-900">
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentCvUrl)}&embedded=true`}
                        className="h-full w-full border-0"
                        title="CV Viewer"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  {t("compUi.selectedFile")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  onClick={handleClear}
                  disabled={isUploading}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <PdfPreviewViewer
                  source={selectedFile}
                  fileName={selectedFile.name}
                  requireAuth={false}
                  className="max-h-[400px] w-full object-contain bg-slate-100 dark:bg-slate-900/50"
                />
              </div>
            </div>
          )}

          {/* File Input */}
          <div className="space-y-2">
            <div
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
                "hover:border-blue-500 hover:bg-blue-50/50 dark:hover:border-blue-400 dark:hover:bg-blue-900/10",
                error ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10" : 
                selectedFile ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30" : "border-slate-200 dark:border-slate-800"
              )}
              onClick={() => !isUploading && inputRef.current?.click()}>
              <div className={cn(
                "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full",
                error ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : 
                selectedFile ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : 
                "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              )}>
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {selectedFile
                  ? t("compUi.clickToSelectAnotherFile")
                  : t("compUi.clickToSelectThePdf")}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {t("common.onlyAcceptPdfFilesMaximum10mb")}
              </p>
            </div>
            <Input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-shrink-0 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            {t("general.cancel")}
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? (
              <>
                <Spinner size="sm" tone="white" className="mr-2" />
                {t("compUi.uploading")}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {t("common.uploadCv")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default CVUploadModal;
