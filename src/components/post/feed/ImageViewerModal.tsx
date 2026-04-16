import { X } from "lucide-react";
import { useCallback, useEffect } from "react";

interface ImageViewerModalProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

export function ImageViewerModal({ src, alt, open, onClose }: ImageViewerModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt ?? "Xem ảnh"}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
        aria-label="Đóng">
        <X className="h-6 w-6" />
      </button>

      <img
        src={src}
        alt={alt ?? ""}
        className="max-h-[90vh] max-w-[95vw] rounded object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
