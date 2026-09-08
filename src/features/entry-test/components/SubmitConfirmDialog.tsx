import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl border-slate-200 bg-white p-0 text-slate-950 sm:max-w-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="px-6 pt-6 pb-5">
          <DialogHeader>
            <DialogTitle>
              {expired ? t("entryTestSubmit.expiredTitle") : t("entryTestSubmit.title")}
            </DialogTitle>
            <DialogDescription>
              {expired ? t("entryTestSubmit.expiredDescription") : t("entryTestSubmit.description")}
            </DialogDescription>
          </DialogHeader>
          {unanswered > 0 && (
            <div className="mt-5 flex gap-3 rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm">{t("entryTestSubmit.unanswered", { count: unanswered })}</p>
            </div>
          )}
        </div>
        <DialogFooter className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <Button
            className="rounded-xl"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending || expired}>
            {expired ? t("entryTestSubmit.processing") : t("entryTestSubmit.continue")}
          </Button>
          <Button
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
            onClick={onConfirm}
            disabled={pending}>
            {pending ? t("entryTestSubmit.submitting") : t("entryTestSubmit.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
