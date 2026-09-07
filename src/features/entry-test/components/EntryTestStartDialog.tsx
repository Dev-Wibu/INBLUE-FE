import { Clock3, FileQuestion, ShieldCheck } from "lucide-react";
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
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 text-slate-950 sm:max-w-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="px-6 pt-6 pb-5">
          <DialogHeader>
            <DialogTitle>{t("entryTestStart.title")}</DialogTitle>
            <DialogDescription>{t("entryTestStart.description")}</DialogDescription>
          </DialogHeader>
          <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            <Info
              icon={Clock3}
              title={t("entryTestStart.time.title")}
              text={t("entryTestStart.time.description")}
            />
            <Info
              icon={FileQuestion}
              title={t("entryTestStart.contents.title")}
              text={t("entryTestStart.contents.description")}
            />
            <Info
              icon={ShieldCheck}
              title={t("entryTestStart.saved.title")}
              text={t("entryTestStart.saved.description")}
            />
          </div>
        </div>
        <DialogFooter className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <Button
            className="rounded-xl"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}>
            {t("entryTestStart.cancel")}
          </Button>
          <Button
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
            onClick={onConfirm}
            disabled={pending}>
            {pending ? t("entryTestStart.creating") : t("entryTestStart.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ icon: Icon, title, text }: { icon: typeof Clock3; title: string; text: string }) {
  return (
    <div className="flex gap-3 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{text}</p>
      </div>
    </div>
  );
}
