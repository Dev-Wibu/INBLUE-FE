import { Clock3, FileQuestion, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EntryTestStartDialog({
  open,
  pending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onOpenChange: (_open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sẵn sàng bắt đầu Entry Test?</DialogTitle>
          <DialogDescription>
            Đồng hồ sẽ chạy ngay sau khi hệ thống tạo đề. Hãy chuẩn bị kết nối ổn định và không tải
            lại trang khi đang gửi bài.
          </DialogDescription>
        </DialogHeader>
        <div className="my-2 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          <Info
            icon={Clock3}
            title="Thời gian có giới hạn"
            text="Thời lượng chính xác sẽ hiển thị ngay khi đề được tạo."
          />
          <Info
            icon={FileQuestion}
            title="Nội dung theo cấu hình"
            text="Gồm câu hỏi chung, chuyên môn và bài lập trình nếu được cấu hình."
          />
          <Info
            icon={ShieldCheck}
            title="Bài làm được lưu trên thiết bị"
            text="Bạn có thể khôi phục câu trả lời sau khi refresh trên trình duyệt này."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Chưa bắt đầu
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? "Đang tạo đề..." : "Bắt đầu làm bài"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ icon: Icon, title, text }: { icon: typeof Clock3; title: string; text: string }) {
  return (
    <div className="flex gap-3 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}
