import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SubmitConfirmDialog({
  open,
  unanswered,
  pending,
  expired,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  unanswered: number;
  pending: boolean;
  expired: boolean;
  onOpenChange: (_open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expired ? "Đã hết thời gian làm bài" : "Nộp bài Entry Test?"}</DialogTitle>
          <DialogDescription>
            {expired
              ? "Hệ thống sẽ gửi bản nháp mới nhất của bạn."
              : "Sau khi nộp, bạn không thể thay đổi câu trả lời hoặc mã nguồn."}
          </DialogDescription>
        </DialogHeader>
        {unanswered > 0 && (
          <div className="flex gap-3 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">
              Bạn còn <strong>{unanswered} mục</strong> chưa trả lời. Các mục này sẽ không được cộng
              điểm.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending || expired}>
            {expired ? "Đang xử lý" : "Tiếp tục làm"}
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? "Đang nộp và chấm bài..." : "Xác nhận nộp bài"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
